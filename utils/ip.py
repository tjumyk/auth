import logging
import socket
from typing import Optional

import geoip2.database
from geoip2.errors import AddressNotFoundError
from geoip2.models import City, ASN

logger = logging.getLogger(__name__)

_geo_city_db = None
_geo_asn_db = None


class IPInfo:
    def __init__(self, city: City, asn: ASN, hostname: str):
        self.city = city
        self.asn = asn
        self.hostname = hostname

    def to_dict(self, locale: str = 'en-US'):
        result = {}
        if self.city:
            country = self.city.country
            result['country'] = country.names.get(locale) or country.name
            result['country_code'] = country.iso_code

            subdivisions = self.city.subdivisions
            result['region'] = subdivisions.most_specific.names.get(locale) or subdivisions.most_specific.name

            city = self.city.city
            result['city'] = city.names.get(locale) or city.name

            location = self.city.location
            result['latitude'] = location.latitude
            result['longitude'] = location.longitude

            result['postal_code'] = self.city.postal.code

        if self.asn:
            result['asn'] = self.asn.autonomous_system_number
            result['organization'] = self.asn.autonomous_system_organization

        if self.hostname:
            result['hostname'] = self.hostname

        return result


def get_geo_city(ip_addr: str) -> Optional[City]:
    global _geo_city_db
    if _geo_city_db is None:
        logger.info('Loading GeoLite2 City...')
        _geo_city_db = geoip2.database.Reader('mmdb/GeoLite2-City.mmdb')

    try:
        return _geo_city_db.city(ip_addr)
    except AddressNotFoundError:
        return None


def get_geo_asn(ip_addr: str) -> Optional[ASN]:
    global _geo_asn_db
    if _geo_asn_db is None:
        logger.info('Loading GeoLite2 ASN...')
        _geo_asn_db = geoip2.database.Reader('mmdb/GeoLite2-ASN.mmdb')
    try:
        return _geo_asn_db.asn(ip_addr)
    except AddressNotFoundError:
        return None


def get_hostname(ip_addr: str) -> str:
    return socket.gethostbyaddr(ip_addr)[0]


def get_ip_info(ip_addr: str, resolve_hostname: bool = False) -> IPInfo:
    return IPInfo(get_geo_city(ip_addr), get_geo_asn(ip_addr), get_hostname(ip_addr) if resolve_hostname else None)
