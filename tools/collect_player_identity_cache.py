"""Refresh only explicit official player identities from the three league summaries."""
import json
import time
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlparse

SOURCES = [
    'https://ibasketball.co.il/league/2023-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa/',
    'https://ibasketball.co.il/league/2024-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa/',
    'https://ibasketball.co.il/league/2025-2/',
]


class OfficialNames(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables, self.records = [], []
        self.in_name, self.href, self.parts = False, None, []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'table':
            self.tables.append('DTFC_Cloned' in attrs.get('class', '').split())
        if tag == 'td':
            self.in_name = 'data-name' in attrs.get('class', '').split() and not any(self.tables)
        if tag == 'a' and self.in_name:
            self.href, self.parts = attrs.get('href'), []

    def handle_data(self, value):
        if self.href:
            self.parts.append(value)

    def handle_endtag(self, tag):
        if tag == 'a' and self.href:
            url = urlparse(self.href)
            params = parse_qs(url.query)
            ids = params.get('p', [])
            name = ''.join(self.parts).strip()
            if (url.scheme == 'https' and url.netloc == 'ibasketball.co.il' and url.path == '/'
                    and len(ids) == 1 and ids[0].isdigit() and int(ids[0]) > 0 and name
                    and params.get('post_type', ['sp_player']) == ['sp_player']):
                self.records.append((int(ids[0]), name))
            self.href, self.parts = None, []
        if tag == 'td':
            self.in_name = False
        if tag == 'table' and self.tables:
            self.tables.pop()


def collect():
    players = {}
    for source in SOURCES:
        request = urllib.request.Request(source, headers={
            'Accept': 'text/html', 'User-Agent': 'Basketball-Stats-Manager/2.3.5',
        })
        with urllib.request.urlopen(request, timeout=12) as response:
            if response.geturl() != source or response.headers.get_content_type() != 'text/html':
                raise ValueError('Unexpected official response')
            html = response.read(5 * 1024 * 1024 + 1)
        if len(html) > 5 * 1024 * 1024:
            raise ValueError('Official response too large')
        parser = OfficialNames()
        parser.feed(html.decode('utf-8'))
        if not parser.records:
            raise ValueError('No explicit official player identities; existing cache was preserved')
        verified_at = int(time.time() * 1000)
        for player_id, name in parser.records:
            players[player_id] = dict(id=player_id, name=name, link=f'https://ibasketball.co.il/?p={player_id}',
                                      verifiedAt=verified_at, sourceUrl=source)
        print(f'{source}: {len(set(player_id for player_id, _ in parser.records))} verified identities')
    output = Path(__file__).resolve().parent.parent / 'data' / 'ibba-player-identities.json'
    output.parent.mkdir(exist_ok=True)
    data = dict(schemaVersion=1, generatedAt=datetime.now(timezone.utc).isoformat(),
                players=[players[key] for key in sorted(players)])
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(players)} unique identities written to {output}')


if __name__ == '__main__':
    collect()
