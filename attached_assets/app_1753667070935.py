
import yaml, sqlite3, os
from flask import Flask, render_template_string, send_from_directory

# Load config file
with open("config.yml", "r") as f:
    config = yaml.safe_load(f)

# Connect to the stash database
conn = sqlite3.connect("stash-go.sqlite", check_same_thread=False)
cursor = conn.cursor()

# Flask setup
app = Flask(__name__)

@app.route("/")
def index():
    cursor.execute("SELECT id, basename FROM files LIMIT 50")
    files = cursor.fetchall()
    return render_template_string("""
    <h1>🎬 Secret Stash (Basic UI)</h1>
    {% for id, basename in files %}
        <div>
            <strong>ID:</strong> {{id}}<br>
            <video width="320" controls>
              <source src="/media/{{basename}}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
            <p>{{basename}}</p>
            <hr>
        </div>
    {% endfor %}
    """, files=files)

@app.route("/media/<path:filename>")
def media(filename):
    media_dir = config.get("media_path", "media")
    return send_from_directory(media_dir, filename)

if __name__ == "__main__":
    app.run(debug=True)
