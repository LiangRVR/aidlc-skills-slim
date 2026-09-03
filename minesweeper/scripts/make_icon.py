"""生成 exe 图标 assets/icon.ico（使用 Qt 离屏绘制，无需第三方图像库）。"""

import os
import sys

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QColor, QGuiApplication, QImage, QPainter, QPen

ICON_PATH = os.path.join("assets", "icon.ico")


def main() -> None:
    QGuiApplication(sys.argv)
    size = 256
    image = QImage(size, size, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)

    # 背景：经典扫雷灰圆角方块
    painter.setPen(Qt.PenStyle.NoPen)
    painter.setBrush(QColor("#BDBDBD"))
    painter.drawRoundedRect(0, 0, size - 1, size - 1, 36, 36)

    # 炸弹主体
    margin = 48
    painter.setBrush(QColor("#202020"))
    painter.drawEllipse(margin, margin + 20, size - 2 * margin, size - 2 * margin - 20)

    # 引信
    painter.setPen(QPen(QColor("#202020"), 12))
    painter.drawLine(size // 2, margin + 20, size // 2 + 26, margin - 6)

    # 火花
    painter.setPen(QPen(QColor("#FFC107"), 10))
    cx, cy = size // 2 + 30, margin - 10
    for dx, dy in ((-26, 0), (26, 0), (0, -26), (0, 26), (-18, -18), (18, 18), (-18, 18), (18, -18)):
        painter.drawLine(cx, cy, cx + dx, cy + dy)

    # 高光
    painter.setPen(Qt.PenStyle.NoPen)
    painter.setBrush(QColor("#FFFFFF"))
    painter.drawEllipse(margin + 32, margin + 52, 36, 24)

    painter.end()

    os.makedirs("assets", exist_ok=True)
    if not image.save(ICON_PATH, "ICO"):
        raise SystemExit(f"无法保存图标: {ICON_PATH}")
    print(f"图标已生成: {ICON_PATH}")


if __name__ == "__main__":
    main()
