import urllib.request
import json
import urllib.parse

url = "https://online-pharmacy-sn88.onrender.com/api/products/search/?q=" + urllib.parse.quote("vitaglobin")
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    print("vitaglobin Search Results:", len(data.get('data', [])))

