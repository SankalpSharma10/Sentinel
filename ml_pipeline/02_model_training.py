import pandas as pd
import numpy as np
import os
import pickle
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import warnings
warnings.filterwarnings('ignore')

print("Starting Model Training Pipeline...")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
INPUT_PATH = os.path.join(DATA_DIR, 'processed_events.csv')

os.makedirs(MODELS_DIR, exist_ok=True)

# Load Processed Data
print(f"Loading processed data from {INPUT_PATH}")
df = pd.read_csv(INPUT_PATH)

# Ensure there's data to train on
if len(df) < 10:
    print("Warning: Dataset is extremely small. Models will overfit significantly (expected for mock demo).")

# Feature Selection
# We drop ID, target variables, and raw text for the X matrix.
X = df[['latitude', 'longitude', 'hour', 'day_of_week', 'is_peak_hour']]

# In a real pipeline, we would one-hot encode event_type. For this MVP, we use the numeric features directly.
# df = pd.get_dummies(df, columns=['event_type', 'event_cause'])

# Define targets
y_impact = df['high_impact']
y_duration = df['duration_class']

# --- MODEL 1: High Impact Binary Classifier ---
print("\n--- Training High Impact Predictor ---")
X_train1, X_test1, y_train1, y_test1 = train_test_split(X, y_impact, test_size=0.2, random_state=42)

model_impact = xgb.XGBClassifier(
    n_estimators=50, 
    max_depth=3, 
    learning_rate=0.1, 
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss'
)
model_impact.fit(X_train1, y_train1)

preds1 = model_impact.predict(X_test1)
print(f"Accuracy: {accuracy_score(y_test1, preds1):.2f}")
print("Classification Report:")
print(classification_report(y_test1, preds1, zero_division=0))

impact_model_path = os.path.join(MODELS_DIR, 'high_impact_model.pkl')
with open(impact_model_path, 'wb') as f:
    pickle.dump(model_impact, f)
print(f"Saved High Impact model to {impact_model_path}")


# --- MODEL 2: Duration Multi-Class Classifier ---
print("\n--- Training Duration Predictor ---")
X_train2, X_test2, y_train2, y_test2 = train_test_split(X, y_duration, test_size=0.2, random_state=42)

model_duration = xgb.XGBClassifier(
    n_estimators=50, 
    max_depth=4, 
    learning_rate=0.1, 
    random_state=42,
    objective='multi:softprob',
    use_label_encoder=False,
    eval_metric='mlogloss'
)

# Fix for multi-class with missing classes in a tiny dataset slice
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
y_train2_encoded = le.fit_transform(y_train2)
y_test2_encoded = le.transform(y_test2)

classes = np.unique(y_train2_encoded)
if len(classes) > 2:
    model_duration.set_params(num_class=len(classes))
    model_duration.fit(X_train2, y_train2_encoded)
    preds2 = model_duration.predict(X_test2)
    print(f"Accuracy: {accuracy_score(y_test2_encoded, preds2):.2f}")
    
    duration_model_path = os.path.join(MODELS_DIR, 'duration_model.pkl')
    with open(duration_model_path, 'wb') as f:
        pickle.dump(model_duration, f)
    print(f"Saved Duration model to {duration_model_path}")
elif len(classes) == 2:
    # Fallback to binary if only 2 classes exist in sample
    model_duration.set_params(objective='binary:logistic', eval_metric='logloss')
    model_duration.fit(X_train2, y_train2_encoded)
    preds2 = model_duration.predict(X_test2)
    print(f"Accuracy (Binary Fallback): {accuracy_score(y_test2_encoded, preds2):.2f}")
    
    duration_model_path = os.path.join(MODELS_DIR, 'duration_model.pkl')
    with open(duration_model_path, 'wb') as f:
        pickle.dump(model_duration, f)
    print(f"Saved Duration model to {duration_model_path}")
else:
    print("Not enough classes to train model. Skipping.")
    print("Not enough classes in training split to train Multi-Class model. Skipping for this dataset sample.")

print("\nPipeline Complete. Models are ready for the FastAPI Backend.")
