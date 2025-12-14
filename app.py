from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# -----------------------
# In-memory database
# -----------------------
leaderboard = {
    "GreenWarrior": {"name": "GreenWarrior", "score": 23, "streak": 12},
    "EcoHacker": {"name": "EcoHacker", "score": 35, "streak": 8},
    "ZeroWaste": {"name": "ZeroWaste", "score": 41, "streak": 15},
}

# -----------------------
# Helpers
# -----------------------
def get_top_10():
    # Lower carbon score is better
    return sorted(
        leaderboard.values(),
        key=lambda x: (x["score"], -x["streak"])
    )[:10]

# -----------------------
# Frontend routes
# -----------------------
@app.route("/")
def index():
    return Response(
        open("index.html", encoding="utf-8").read(),
        mimetype="text/html"
    )

@app.route("/style.css")
def css():
    return Response(
        open("style.css", encoding="utf-8").read(),
        mimetype="text/css"
    )

@app.route("/script.js")
def js():
    return Response(
        open("script.js", encoding="utf-8").read(),
        mimetype="application/javascript"
    )


# -----------------------
# API routes
# -----------------------
@app.route("/api/leaderboard")
def api_leaderboard():
    return jsonify(get_top_10())

@app.route("/api/score", methods=["POST"])
def save_score():
    try:
        data = request.get_json(force=True)
        user_id = data["userId"]

        leaderboard[user_id] = {
            "name": user_id[:8],
            "score": int(data["score"]),
            "streak": int(data["streak"])
        }

        return jsonify({
            "status": "saved",
            "leaderboard": get_top_10()
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# -----------------------
# Run server
# -----------------------
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
