#!/usr/bin/env python3
"""Pack the game into 3 files (index.html, sw.js, icon.png) in ../single/ for easy phone upload.
Needs esbuild + three@0.170.0 installed somewhere: python3 tools/build-single.py /path/to/node_modules"""
import base64, re, subprocess, sys, pathlib, shutil
nm = pathlib.Path(sys.argv[1]); G = pathlib.Path(__file__).resolve().parent.parent; OUT = G / 'single'
OUT.mkdir(exist_ok=True)
subprocess.run([str(nm / '.bin/esbuild'), 'js/main.js', '--bundle', '--format=iife', '--minify', '--target=safari15',
                f'--alias:three={nm}/three/build/three.module.js', f'--outfile={OUT}/bundle.js'], cwd=G, check=True)
css = (G / 'css/style.css').read_text()
css = re.sub(r"url\(\.\./fonts/([^)]+)\)", lambda m: 'url(data:font/woff2;base64,%s)' % base64.b64encode((G / 'fonts' / m.group(1)).read_bytes()).decode(), css)
js = (OUT / 'bundle.js').read_text().replace('</script', '<\\/script')
html = (G / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>')
html = re.sub(r'<script type="importmap">.*?</script>\n', '', html)
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
html = html.replace('href="icons/icon-180.png"', 'href="icon.png"').replace('href="icons/icon-192.png"', 'href="icon.png"')
html = html.replace('<script type="module" src="js/main.js"></script>', '<script>' + js + '</script>')
(OUT / 'index.html').write_text(html)
(OUT / 'bundle.js').unlink()
shutil.copy(G / 'icons/icon-180.png', OUT / 'icon.png')
print('built', OUT)
