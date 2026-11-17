import numpy as np
from typing import Dict, Any
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, brier_score_loss, confusion_matrix
)
from app.api.schemas import Metrics, ConfusionMatrix


def evaluate_model(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: np.ndarray
) -> Metrics:
    """
    Computes rigorous evaluation metrics on a held-out test dataset:
    Accuracy, Precision, Recall, F1, ROC-AUC, Brier score (calibration), and Confusion Matrix.
    """
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        auc = 0.5

    brier = float(brier_score_loss(y_true, y_prob))

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    # labels=[0, 1]:
    # cm[0, 0] = tn, cm[0, 1] = fp
    # cm[1, 0] = fn, cm[1, 1] = tp
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    return Metrics(
        accuracy=round(acc, 4),
        precision=round(prec, 4),
        recall=round(rec, 4),
        f1=round(f1, 4),
        rocAuc=round(auc, 4),
        brierScore=round(brier, 4),
        confusionMatrix=ConfusionMatrix(
            tp=tp,
            fp=fp,
            tn=tn,
            fn=fn
        )
    )

