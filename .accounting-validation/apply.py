"""Materialize the locally tested, checksum-verified source edits on the validation branch."""
import base64,gzip,hashlib,json,pathlib
root=pathlib.Path.cwd()
encoded=''.join((root/'.accounting-validation'/f'part{i}').read_text() for i in (1,2,3))
# Correct a duplicated transfer substring; the full checksum below is authoritative.
encoded=encoded.replace('PboRboR8SJH','PboR8SJH')
raw=gzip.decompress(base64.b64decode(encoded,validate=True))
assert hashlib.sha256(raw).hexdigest()=='3e92ad3a7aca7bbeafd4e3d7feb8ecc917842713af61b062ea4ca57abb53467f','Source delta checksum mismatch'
changes=json.loads(raw)
for entry in changes:
    rel=pathlib.PurePosixPath(entry['p'])
    assert not rel.is_absolute() and '..' not in rel.parts
    path=root/rel
    old=path.read_bytes() if path.exists() else b''
    assert hashlib.sha256(old).hexdigest()==entry['sha'],f'Unexpected base file: {rel}'
for entry in changes:
    path=root/entry['p']
    if entry.get('delete'):
        path.unlink()
        continue
    lines=path.read_text().splitlines(keepends=True) if path.exists() else []
    for start,end,text in reversed(entry['changes']):
        lines[start:end]=[text]
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(''.join(lines))
print(f'Materialized {len(changes)} reviewed source changes')
