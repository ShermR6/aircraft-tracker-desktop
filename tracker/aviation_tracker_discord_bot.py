#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FinalPing Aviation Tracker
Tracks aircraft via ADS-B and sends notifications via webhooks
(Discord, Slack, Microsoft Teams)
"""

import json
import sys
import time
import asyncio
import requests
from datetime import datetime
from math import radians, cos, sin, asin, sqrt

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def log(msg):
    """Print with timestamp"""
    print(f"{datetime.now().strftime('%H:%M:%S')} {msg}", flush=True)


class WebhookSender:
    """Sends notifications to Discord, Slack, and Teams webhooks"""

    def __init__(self, config):
        integrations = config.get('integrations', {})
        self.discord_url  = integrations.get('discord', {}).get('webhook_url', '') if integrations.get('discord', {}).get('enabled') else ''
        self.slack_url    = integrations.get('slack',   {}).get('webhook_url', '') if integrations.get('slack',   {}).get('enabled') else ''
        self.teams_url    = integrations.get('teams',   {}).get('webhook_url', '') if integrations.get('teams',   {}).get('enabled') else ''

        # Also support legacy discord_bot.webhook_url
        if not self.discord_url:
            self.discord_url = config.get('discord_bot', {}).get('webhook_url', '')

        enabled = []
        if self.discord_url:  enabled.append('Discord')
        if self.slack_url:    enabled.append('Slack')
        if self.teams_url:    enabled.append('Teams')

        if enabled:
            log(f"[OK] Notifications enabled: {', '.join(enabled)}")
        else:
            log("[WARN] No webhook URLs configured - notifications will not be sent")

    def send(self, message):
        """Send to all configured webhooks"""
        sent = False
        if self.discord_url:
            sent = self._send_discord(message) or sent
        if self.slack_url:
            sent = self._send_slack(message) or sent
        if self.teams_url:
            sent = self._send_teams(message) or sent
        return sent

    def _send_discord(self, message):
        try:
            r = requests.post(self.discord_url, json={"content": message}, timeout=10)
            r.raise_for_status()
            log(f"[OK] Discord notification sent")
            return True
        except Exception as e:
            log(f"[ERR] Discord failed: {e}")
            return False

    def _send_slack(self, message):
        try:
            r = requests.post(self.slack_url, json={"text": message}, timeout=10)
            r.raise_for_status()
            log(f"[OK] Slack notification sent")
            return True
        except Exception as e:
            log(f"[ERR] Slack failed: {e}")
            return False

    def _send_teams(self, message):
        try:
            r = requests.post(self.teams_url, json={"text": message}, timeout=10)
            r.raise_for_status()
            log(f"[OK] Teams notification sent")
            return True
        except Exception as e:
            log(f"[ERR] Teams failed: {e}")
            return False


class AviationTracker:
    def __init__(self, config):
        self.config = config
        self.webhook = WebhookSender(config)

        # Tracking state
        self.aircraft_state = {}
        self.last_notifications = {}
        self.distance_alerts_sent = {}

    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance in nautical miles"""
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return 3440.065 * c

    def get_aircraft_data(self):
        """Fetch aircraft data from adsb.lol"""
        try:
            airspace = self.config['airspace']
            lat = airspace['center_lat']
            lon = airspace['center_lon']

            if 'query_radius_nm' in airspace:
                radius = airspace['query_radius_nm']
            else:
                radius = max(self.config['airspace'].get('alert_distances_nm', [10.0])) + 5

            url = f"https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{radius}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()
            aircraft_list = []

            if data and 'ac' in data and data['ac']:
                tracked_icao24s = set(icao.lower() for icao in self.config['aircraft']['icao24_codes'])

                for aircraft in data['ac']:
                    aircraft_icao = aircraft.get('hex', '').lower()

                    if aircraft_icao in tracked_icao24s:
                        try:
                            idx = [x.lower() for x in self.config['aircraft']['icao24_codes']].index(aircraft_icao)
                            tail_number = self.config['aircraft']['tail_numbers'][idx]
                        except (ValueError, IndexError):
                            tail_number = aircraft_icao

                        aircraft_list.append({
                            'icao24': aircraft_icao,
                            'callsign': aircraft.get('flight', tail_number).strip() or tail_number,
                            'longitude': aircraft.get('lon'),
                            'latitude': aircraft.get('lat'),
                            'baro_altitude': aircraft.get('alt_baro', 0) * 0.3048 if aircraft.get('alt_baro') and aircraft.get('alt_baro') != 'ground' else None,
                            'on_ground': aircraft.get('alt_baro') == 'ground' or aircraft.get('gs', 0) < 30,
                            'velocity': aircraft.get('gs', 0) * 0.514444 if aircraft.get('gs') else None,
                        })

            return aircraft_list

        except Exception as e:
            log(f"[ERR] Fetching aircraft data: {e}")
            return []

    def should_notify(self, event_type, aircraft_id):
        """Check cooldown"""
        key = f"{aircraft_id}_{event_type}"
        now = datetime.now()
        cooldown_minutes = self.config['notifications'].get('cooldown_minutes', 2)

        if key in self.last_notifications:
            time_since_last = (now - self.last_notifications[key]).total_seconds() / 60
            if time_since_last < cooldown_minutes:
                return False

        self.last_notifications[key] = now
        return True

    def is_quiet_hours(self):
        """Check if current time is in quiet hours"""
        quiet = self.config['notifications'].get('quiet_hours', {})
        if not quiet.get('enabled'):
            return False
        try:
            now = datetime.now().strftime('%H:%M')
            start = quiet.get('start', '23:00')
            end = quiet.get('end', '06:00')
            if start <= end:
                return start <= now <= end
            else:  # overnight
                return now >= start or now <= end
        except Exception:
            return False

    def send_notification(self, message):
        """Send notification if not in quiet hours"""
        if self.is_quiet_hours():
            log(f"[QUIET] Suppressed: {message[:50]}")
            return False
        return self.webhook.send(message)

    async def check_and_notify(self, aircraft_data):
        """Check aircraft state and send notifications"""
        aircraft_id = aircraft_data['icao24']
        callsign = aircraft_data['callsign']
        on_ground = aircraft_data['on_ground']

        if aircraft_data['latitude'] is None or aircraft_data['longitude'] is None:
            return

        airspace = self.config['airspace']
        distance_nm = self.haversine_distance(
            airspace['center_lat'], airspace['center_lon'],
            aircraft_data['latitude'], aircraft_data['longitude']
        )

        in_horizontal = distance_nm <= airspace['radius_nm']

        altitude_msl_m = aircraft_data['baro_altitude']
        if altitude_msl_m is not None:
            altitude_msl_ft = altitude_msl_m * 3.28084
            altitude_agl_ft = altitude_msl_ft - airspace.get('field_elevation_ft_msl', 0)
            in_vertical = airspace.get('floor_ft_agl', 0) <= altitude_agl_ft <= airspace.get('ceiling_ft_agl', 3000)
        else:
            altitude_agl_ft = 0
            altitude_msl_ft = 0
            in_vertical = on_ground

        in_airspace = in_horizontal and in_vertical

        was_in_airspace = self.aircraft_state.get(aircraft_id, {}).get('in_airspace', False)
        was_on_ground = self.aircraft_state.get(aircraft_id, {}).get('on_ground', None)

        # Distance alerts
        if not on_ground:
            alert_distances = sorted(self.config['airspace'].get('alert_distances_nm', [10.0, 5.0, 2.0]), reverse=True)

            if aircraft_id not in self.distance_alerts_sent:
                self.distance_alerts_sent[aircraft_id] = set()

            prev_distance = self.aircraft_state.get(aircraft_id, {}).get('last_distance', None)
            max_distance = self.aircraft_state.get(aircraft_id, {}).get('max_distance', None)

            if max_distance is None or distance_nm > max_distance:
                max_distance = distance_nm

            if prev_distance:
                direction = "Approaching" if distance_nm < prev_distance else "Departing"
                log(f"  {direction} ({distance_nm:.1f}nm, max: {max_distance:.1f}nm)")

            if max_distance is not None and prev_distance is not None:
                for alert_distance in alert_distances:
                    alert_key = f"{alert_distance}nm"
                    was_beyond_boundary = max_distance > alert_distance
                    crossed_boundary = (prev_distance > alert_distance and distance_nm <= alert_distance)

                    if crossed_boundary and was_beyond_boundary and alert_key not in self.distance_alerts_sent[aircraft_id]:
                        if alert_distance == 2.0:
                            if "10.0nm" in self.distance_alerts_sent[aircraft_id] and "5.0nm" in self.distance_alerts_sent[aircraft_id]:
                                if self.should_notify('landing', aircraft_id):
                                    already_landed = self.aircraft_state.get(aircraft_id, {}).get('landed', False)
                                    if not already_landed:
                                        message = f"**{callsign} LANDING**\nTime: {datetime.now().strftime('%H:%M')}\nReady to put away\n(Within 2nm - sequential approach)"
                                        log(f"  LANDING: {callsign} (10nm -> 5nm -> 2nm)")
                                        self.send_notification(message)
                                        if aircraft_id not in self.aircraft_state:
                                            self.aircraft_state[aircraft_id] = {}
                                        self.aircraft_state[aircraft_id]['landed'] = True
                                        self.distance_alerts_sent[aircraft_id].add(alert_key)
                            else:
                                if self.should_notify(f'distance_{alert_distance}', aircraft_id):
                                    eta_minutes = int(distance_nm / 1.5)
                                    message = f"**{callsign} - {alert_distance:.0f}nm out**\nETA ~{eta_minutes}min, Alt {altitude_agl_ft:.0f}ft AGL"
                                    log(f"  Alert: {alert_distance:.0f}nm")
                                    self.send_notification(message)
                                    self.distance_alerts_sent[aircraft_id].add(alert_key)
                        else:
                            if self.should_notify(f'distance_{alert_distance}', aircraft_id):
                                eta_minutes = int(distance_nm / 1.5)
                                message = f"**{callsign} - {alert_distance:.0f}nm out**\nETA ~{eta_minutes}min, Alt {altitude_agl_ft:.0f}ft AGL"
                                log(f"  Alert: {alert_distance:.0f}nm")
                                self.send_notification(message)
                                self.distance_alerts_sent[aircraft_id].add(alert_key)

            if distance_nm > 12.0:
                self.distance_alerts_sent[aircraft_id] = set()
                if aircraft_id in self.aircraft_state:
                    self.aircraft_state[aircraft_id]['max_distance'] = distance_nm

            if aircraft_id not in self.aircraft_state:
                self.aircraft_state[aircraft_id] = {}
            self.aircraft_state[aircraft_id]['last_distance'] = distance_nm
            self.aircraft_state[aircraft_id]['max_distance'] = max_distance

        # Leaving airspace
        if was_in_airspace and not was_on_ground and not in_airspace:
            if aircraft_id not in self.aircraft_state:
                self.aircraft_state[aircraft_id] = {}

            already_landed = self.aircraft_state[aircraft_id].get('landed', False)

            if 'left_airspace_time' not in self.aircraft_state[aircraft_id] and not already_landed:
                self.aircraft_state[aircraft_id]['left_airspace_time'] = datetime.now()
                velocity_kts = aircraft_data.get('velocity', 0) * 1.94384 if aircraft_data.get('velocity') else 0
                field_elevation = airspace.get('field_elevation_ft_msl', 0)
                is_ground_level = abs(altitude_msl_ft - field_elevation) < 200
                is_slow = velocity_kts < 60

                if is_ground_level and is_slow:
                    if self.should_notify('landing', aircraft_id):
                        message = f"**{callsign} LANDED**\nTime: {datetime.now().strftime('%H:%M')}\nReady to put away"
                        self.send_notification(message)
                        self.aircraft_state[aircraft_id]['landed'] = True

        # Direct ground detection
        elif in_airspace and on_ground and was_on_ground == False:
            already_landed = self.aircraft_state.get(aircraft_id, {}).get('landed', False)
            if not already_landed:
                if self.should_notify('landing', aircraft_id):
                    message = f"**{callsign} LANDED**\nTime: {datetime.now().strftime('%H:%M')}\nReady to put away"
                    self.send_notification(message)
                    if aircraft_id not in self.aircraft_state:
                        self.aircraft_state[aircraft_id] = {}
                    self.aircraft_state[aircraft_id]['landed'] = True

        # Update state
        if aircraft_id not in self.aircraft_state:
            self.aircraft_state[aircraft_id] = {}

        self.aircraft_state[aircraft_id].update({
            'in_airspace': in_airspace,
            'on_ground': on_ground,
            'last_update': datetime.now(),
            'consecutive_missing': 0,
        })

        # Takeoff detection - reset flags
        if in_airspace and not on_ground and was_on_ground == True:
            if aircraft_id in self.distance_alerts_sent:
                self.distance_alerts_sent[aircraft_id] = set()
            if aircraft_id in self.aircraft_state:
                self.aircraft_state[aircraft_id]['landed'] = False
                self.aircraft_state[aircraft_id]['max_distance'] = distance_nm
                self.aircraft_state[aircraft_id].pop('left_airspace_time', None)

    async def run(self):
        """Main tracking loop"""
        poll_interval = self.config.get('monitoring', {}).get('poll_interval_seconds', 10)
        airspace_name = self.config['airspace'].get('name', 'My Airport')
        query_radius = self.config['airspace'].get('query_radius_nm', 100)

        log("=" * 60)
        log("FinalPing Aviation Tracker")
        log("=" * 60)
        log(f"Tracking {len(self.config['aircraft']['tail_numbers'])} aircraft:")
        for tail, icao in zip(self.config['aircraft']['tail_numbers'], self.config['aircraft']['icao24_codes']):
            log(f"  {tail} ({icao})")
        log(f"Location: {airspace_name} within {query_radius}nm")
        log(f"Poll interval: {poll_interval}s")
        log("=" * 60)
        log("Tracker running. Waiting for aircraft...")

        while True:
            try:
                aircraft_list = self.get_aircraft_data()
                seen_aircraft = set()

                if aircraft_list:
                    for aircraft_data in aircraft_list:
                        seen_aircraft.add(aircraft_data['icao24'])
                        await self.check_and_notify(aircraft_data)

                        airspace = self.config['airspace']
                        if aircraft_data['latitude'] and aircraft_data['longitude']:
                            distance_nm = self.haversine_distance(
                                airspace['center_lat'], airspace['center_lon'],
                                aircraft_data['latitude'], aircraft_data['longitude']
                            )
                            in_airspace = self.aircraft_state.get(aircraft_data['icao24'], {}).get('in_airspace')
                            status = "IN RANGE" if in_airspace else "Outside"
                            ground_status = "On Ground" if aircraft_data['on_ground'] else "Airborne"
                            log(f"{aircraft_data['callsign']} - {status} - {ground_status} - {distance_nm:.1f}nm")
                else:
                    log("No tracked aircraft found")

                # Check for disappeared aircraft (possible landings)
                for aircraft_id, state in list(self.aircraft_state.items()):
                    if aircraft_id not in seen_aircraft:
                        was_in_airspace = state.get('in_airspace', False)
                        was_on_ground = state.get('on_ground', False)
                        consecutive_missing = state.get('consecutive_missing', 0) + 1
                        left_airspace_time = state.get('left_airspace_time', None)

                        recently_left_airspace = False
                        if left_airspace_time:
                            time_since_left = (datetime.now() - left_airspace_time).total_seconds()
                            recently_left_airspace = time_since_left < 300

                        if was_in_airspace and not was_on_ground and consecutive_missing >= 2:
                            already_landed = state.get('landed', False)
                            if not already_landed and self.should_notify('landing', aircraft_id):
                                try:
                                    idx = [x.lower() for x in self.config['aircraft']['icao24_codes']].index(aircraft_id)
                                    callsign = self.config['aircraft']['tail_numbers'][idx]
                                except (ValueError, IndexError):
                                    callsign = aircraft_id.upper()
                                message = f"**{callsign} LANDED**\nTime: {datetime.now().strftime('%H:%M')}\nReady to put away\n(Signal lost in airspace)"
                                self.send_notification(message)
                            del self.aircraft_state[aircraft_id]

                        elif recently_left_airspace and not was_on_ground and consecutive_missing >= 1:
                            already_landed = state.get('landed', False)
                            if not already_landed and self.should_notify('landing', aircraft_id):
                                try:
                                    idx = [x.lower() for x in self.config['aircraft']['icao24_codes']].index(aircraft_id)
                                    callsign = self.config['aircraft']['tail_numbers'][idx]
                                except (ValueError, IndexError):
                                    callsign = aircraft_id.upper()
                                message = f"**{callsign} LANDED**\nTime: {datetime.now().strftime('%H:%M')}\nReady to put away\n(Left airspace then signal lost)"
                                self.send_notification(message)
                            del self.aircraft_state[aircraft_id]

                        else:
                            self.aircraft_state[aircraft_id]['consecutive_missing'] = consecutive_missing

            except Exception as e:
                log(f"[ERR] Tracking loop error: {e}")
                import traceback
                traceback.print_exc()

            await asyncio.sleep(poll_interval)


async def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else 'tracker_config.json'

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except FileNotFoundError:
        log(f"[ERR] Config file not found: {config_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        log(f"[ERR] Invalid config JSON: {e}")
        sys.exit(1)

    if not config.get('aircraft', {}).get('icao24_codes'):
        log("[ERR] No aircraft configured")
        sys.exit(1)

    tracker = AviationTracker(config)
    try:
        await tracker.run()
    except KeyboardInterrupt:
        log("Tracker stopped by user")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log("Tracker stopped")
