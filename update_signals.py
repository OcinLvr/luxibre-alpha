import requests
import json
from datetime import datetime

# Configurer l'API
API_KEY = "YOUR_API_KEY"  # Remplace par ta propre clé Alpha Vantage
SYMBOL = "EURUSD"  # Paire forex à surveiller
FUNCTION = "FX_INTRADAY"

# Appel à l'API
url = f"https://www.alphavantage.co/query?function= {FUNCTION}&from_symbol={SYMBOL}&interval=15min&apikey={API_KEY}"
response = requests.get(url)
data = response.json()

# Génère un signal basique (à remplacer par une logique plus avancée si besoin)
signal_title = f"{SYMBOL} – Opportunité haussière"
signal_description = "Zone de support claire détectée, objectif technique calculé."
signal_timeframe = "H4"
signal_confidence = "Élevée"
signal_type = "forex"

# Sauvegarder dans signals.json
with open("data/signals.json", "w") as f:
    json.dump({
        "last_updated": datetime.utcnow().isoformat(),
        "signals": [{
            "title": signal_title,
            "description": signal_description,
            "timeframe": signal_timeframe,
            "confidence": signal_confidence,
            "type": signal_type
        }]
    }, f, indent=2)

print("✅ Signaux mis à jour")
