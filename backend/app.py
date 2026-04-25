from flask import Flask, jsonify
from flask_cors import CORS

from routes.predict import predict_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(predict_bp)

    @app.get("/")
    def index():
        return jsonify(
            {
                "app": "AI Clinical Decision Support System",
                "status": "running",
                "endpoints": ["/health", "/predict", "/predict/batch"],
            }
        )

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5001, debug=True)
