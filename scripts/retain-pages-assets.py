"""Keep previous deployed assets so cached HTML can still boot during an update."""
import json
import pathlib
import re
import subprocess
import tarfile
import tempfile


def gh(*args):
    result = subprocess.run(['gh', *args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Unable to retrieve previous Pages assets; deployment stopped to protect cached clients.')
    return result.stdout


runs = json.loads(gh('run', 'list', '--workflow', 'pages.yml', '--branch', 'main', '--status', 'success', '--limit', '5', '--json', 'databaseId'))
for run in runs:
    with tempfile.TemporaryDirectory() as directory:
        gh('run', 'download', str(run['databaseId']), '--name', 'github-pages', '--dir', directory)
        archives = list(pathlib.Path(directory).glob('*.tar'))
        if len(archives) != 1:
            raise RuntimeError('Previous Pages artifact is not a single tar archive.')
        kept = 0
        with tarfile.open(archives[0]) as archive:
            for member in archive.getmembers():
                name = member.name.removeprefix('./')
                if not member.isfile() or not re.fullmatch(r'assets/[A-Za-z0-9_.-]+', name):
                    continue
                target = pathlib.Path('dist') / name
                if not target.exists():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(archive.extractfile(member).read())
                    kept += 1
        print(f'Retained {kept} assets for previously opened versions.')
if not runs:
    print('First deployment: no previous assets to retain.')
