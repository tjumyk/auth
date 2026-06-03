import logging
import socket
from typing import Callable, Literal, Optional, TypeVar

import geoip2.database
from geoip2.errors import AddressNotFoundError
from geoip2.models import City, ASN, Country

logger = logging.getLogger(__name__)

_GeoDb = geoip2.database.Reader | Literal[False] | None
_GeoLookupResult = TypeVar('_GeoLookupResult')

_geo_country_db: _GeoDb = None
_geo_city_db: _GeoDb = None
_geo_asn_db: _GeoDb = None


def _open_geo_db(path: str, label: str) -> geoip2.database.Reader | Literal[False]:
    try:
        logger.info('Loading GeoLite2 %s...', label)
        return geoip2.database.Reader(path)
    except (FileNotFoundError, OSError) as exc:
        logger.warning('GeoLite2 %s database unavailable at %s: %s', label, path, exc)
        return False


def _lookup_geo(
    ip_addr: str,
    db: _GeoDb,
    path: str,
    label: str,
    lookup: Callable[[geoip2.database.Reader, str], _GeoLookupResult],
) -> tuple[_GeoDb, Optional[_GeoLookupResult]]:
    if db is None:
        db = _open_geo_db(path, label)
    if db is False:
        return db, None
    try:
        return db, lookup(db, ip_addr)
    except AddressNotFoundError:
        return db, None


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


class IPCountryInfo:
    def __init__(self, country: Country):
        self._country = country

    def to_dict(self, locale: str = 'en-US'):
        result = {}
        if self._country:
            country = self._country.country
            result['name'] = country.names.get(locale) or country.name
            result['iso_code'] = country.iso_code
        return result


def get_geo_country(ip_addr: str) -> Optional[Country]:
    global _geo_country_db
    _geo_country_db, result = _lookup_geo(
        ip_addr,
        _geo_country_db,
        'mmdb/GeoLite2-Country.mmdb',
        'Country',
        lambda reader, addr: reader.country(addr),
    )
    return result


def get_geo_city(ip_addr: str) -> Optional[City]:
    global _geo_city_db
    _geo_city_db, result = _lookup_geo(
        ip_addr,
        _geo_city_db,
        'mmdb/GeoLite2-City.mmdb',
        'City',
        lambda reader, addr: reader.city(addr),
    )
    return result


def get_geo_asn(ip_addr: str) -> Optional[ASN]:
    global _geo_asn_db
    _geo_asn_db, result = _lookup_geo(
        ip_addr,
        _geo_asn_db,
        'mmdb/GeoLite2-ASN.mmdb',
        'ASN',
        lambda reader, addr: reader.asn(addr),
    )
    return result


def get_hostname(ip_addr: str) -> Optional[str]:
    try:
        return socket.gethostbyaddr(ip_addr)[0]
    except socket.herror:
        return None


def get_ip_info(ip_addr: str, resolve_hostname: bool = False) -> IPInfo:
    return IPInfo(get_geo_city(ip_addr), get_geo_asn(ip_addr), get_hostname(ip_addr) if resolve_hostname else None)


def get_ip_country_info(ip_addr: str) -> IPCountryInfo:
    return IPCountryInfo(get_geo_country(ip_addr))
