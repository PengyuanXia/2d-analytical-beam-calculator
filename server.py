"""
PolyBeam Local Web Server
Hosts the application and opens the default web browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 2001

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching headers for local assets
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    global PORT
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("  PolyBeam Web - Analytical Beam Calculator")
        print(f"  Running locally at: {url}")
        print("  Press Ctrl+C to stop the server.")
        print("=" * 60)
        sys.stdout.flush()
        
        # Open in default browser
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"Note: Could not automatically open browser: {e}")
            
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down PolyBeam server...")
            httpd.server_close()

if __name__ == '__main__':
    run_server()
