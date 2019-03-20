import requests


def get_external_user_info(user_name: str, sources: []) -> []:
    results = []
    for source in sources:
        source_type = source.get('type')
        if source_type == 'pwd_agent':  # the only supported source right now
            result = dict(id=source.get('id'), name=source.get('name'), type=source_type)
            try:
                api = 'http://%s:%d/api' % (source.get('host'), source.get('port'))
                resp = requests.get(api, params=dict(names=user_name))
                if resp.status_code == 200:
                    _json = resp.json() or {}
                    result['result'] = _json.get(user_name)
                else:
                    result['error'] = dict(msg='failed to get passwd entry', detail=resp.text)
            except requests.exceptions.ConnectionError:
                result['error'] = dict(msg='connection error')
            except IOError as e:
                result['error'] = dict(msg=str(e))
            results.append(result)
    return results
