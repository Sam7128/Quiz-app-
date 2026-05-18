import sys
import os
from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QTreeWidget, QTreeWidgetItem, QPushButton, 
                             QLineEdit, QLabel, QMessageBox, QHeaderView, QSplitter,
                             QTextEdit, QStyle, QAbstractItemView)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QIcon

class ConfigEditor(QMainWindow):
    def __init__(self, config_manager):
        super().__init__()
        self.config_manager = config_manager
        self._updating_item = False
        self.setWindowTitle("GhostWriter Radial Menu 配置編輯器")
        self.resize(600, 500)
        
        self.init_ui()
        self.load_data()
        self.tree.itemChanged.connect(self.on_item_changed)

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)

        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Tree Widget
        self.tree = QTreeWidget()
        self.tree.setHeaderLabels(["標籤", "類型", "內容"])
        self.tree.header().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.tree.setEditTriggers(
            QAbstractItemView.EditTrigger.DoubleClicked
            | QAbstractItemView.EditTrigger.SelectedClicked
            | QAbstractItemView.EditTrigger.EditKeyPressed
        )
        splitter.addWidget(self.tree)

        # Real-time preview
        self.preview = QTextEdit()
        self.preview.setReadOnly(True)
        self.preview.setPlaceholderText("即時預覽將顯示在這裡")
        splitter.addWidget(self.preview)
        splitter.setSizes([420, 180])
        layout.addWidget(splitter)
        
        # Buttons
        btn_layout = QHBoxLayout()
        self.btn_add_folder = QPushButton("新增分類")
        self.btn_add_item = QPushButton("新增語句")
        self.btn_delete = QPushButton("刪除選取項")
        self.btn_save = QPushButton("儲存變更")
        
        btn_layout.addWidget(self.btn_add_folder)
        btn_layout.addWidget(self.btn_add_item)
        btn_layout.addWidget(self.btn_delete)
        btn_layout.addStretch()
        btn_layout.addWidget(self.btn_save)
        
        layout.addLayout(btn_layout)
        
        # Connect signals
        self.btn_add_folder.clicked.connect(self.add_folder)
        self.btn_add_item.clicked.connect(self.add_item)
        self.btn_delete.clicked.connect(self.delete_item)
        self.btn_save.clicked.connect(self.save_data)
        self.tree.itemDoubleClicked.connect(self.edit_item)
        self.tree.itemSelectionChanged.connect(self.update_preview)

    def load_data(self):
        self.tree.blockSignals(True)
        self.tree.clear()
        items = self.config_manager.get_items()
        for item in items:
            self.add_tree_node(self.tree, item)
        self.tree.expandAll()
        self.tree.blockSignals(False)
        self.update_preview()

    def _set_node_icon(self, node):
        style = self.style()
        icon_kind = QStyle.StandardPixmap.SP_DirIcon if node.text(1) == "submenu" else QStyle.StandardPixmap.SP_FileIcon
        try:
            icon = style.standardIcon(icon_kind)
        except TypeError:
            # Some PyQt6 builds expect raw int instead of enum wrapper.
            try:
                icon = style.standardIcon(int(icon_kind.value))
            except Exception:
                icon = QIcon()
        node.setIcon(0, icon)

    def add_tree_node(self, parent, item_data):
        node = QTreeWidgetItem(parent)
        node.setText(0, item_data.get("label", "New Item"))
        node.setText(1, item_data.get("type", "text"))
        node.setText(2, item_data.get("content", ""))
        node.setFlags(node.flags() | Qt.ItemFlag.ItemIsEditable)
        self._set_node_icon(node)
        
        if item_data.get("type") == "submenu":
            for child in item_data.get("items", []):
                self.add_tree_node(node, child)
        return node

    def add_folder(self):
        parent = self.tree.currentItem() or self.tree.invisibleRootItem()
        # If parent is a text item, add to its parent instead
        if parent != self.tree.invisibleRootItem() and parent.text(1) == "text":
            parent = parent.parent() or self.tree.invisibleRootItem()
            
        node = QTreeWidgetItem(parent)
        node.setText(0, "新分類")
        node.setText(1, "submenu")
        node.setFlags(node.flags() | Qt.ItemFlag.ItemIsEditable)
        self._set_node_icon(node)
        self.tree.setCurrentItem(node)
        self.tree.editItem(node, 0)

    def add_item(self):
        parent = self.tree.currentItem() or self.tree.invisibleRootItem()
        # If parent is a text item, add to its parent instead
        if parent != self.tree.invisibleRootItem() and parent.text(1) == "text":
            parent = parent.parent() or self.tree.invisibleRootItem()

        node = QTreeWidgetItem(parent)
        node.setText(0, "新語句")
        node.setText(1, "text")
        node.setText(2, "在這裡輸入文字內容")
        node.setFlags(node.flags() | Qt.ItemFlag.ItemIsEditable)
        self._set_node_icon(node)
        self.tree.setCurrentItem(node)
        self.tree.scrollToItem(node)
        # Start editing content directly so users can type phrase immediately.
        self.tree.editItem(node, 2)

    def delete_item(self):
        item = self.tree.currentItem()
        if item:
            reply = QMessageBox.question(self, '確認刪除', 
                                         f"確定要刪除 '{item.text(0)}' 嗎？", 
                                         QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
            if reply == QMessageBox.StandardButton.Yes:
                parent = item.parent() or self.tree.invisibleRootItem()
                parent.removeChild(item)
                self.update_preview()

    def edit_item(self, item, column):
        self.tree.editItem(item, column)

    def on_item_changed(self, item, column):
        if self._updating_item:
            return
        self._updating_item = True
        self.tree.blockSignals(True)
        try:
            if column == 1 and item.text(1) not in ("text", "submenu"):
                item.setText(1, "text")
            self._set_node_icon(item)
        finally:
            self.tree.blockSignals(False)
            self._updating_item = False
        self.update_preview()

    def update_preview(self):
        item = self.tree.currentItem()
        if not item:
            self.preview.clear()
            return

        label = item.text(0)
        item_type = item.text(1)
        content = item.text(2) if item_type == "text" else f"子項目數量: {item.childCount()}"
        self.preview.setPlainText(
            f"標籤: {label}\n類型: {item_type}\n內容預覽: {content}"
        )

    def save_data(self):
        data = {"items": self.get_tree_data(self.tree.invisibleRootItem())}
        if self.config_manager.save_config(data):
            QMessageBox.information(self, "成功", "配置已儲存！")
        else:
            QMessageBox.critical(self, "錯誤", "儲存失敗，請檢查格式是否正確。")

    def get_tree_data(self, parent_node):
        items = []
        for i in range(parent_node.childCount()):
            child = parent_node.child(i)
            item = {
                "label": child.text(0),
                "type": child.text(1)
            }
            if item["type"] == "submenu":
                item["items"] = self.get_tree_data(child)
            else:
                item["content"] = child.text(2)
            items.append(item)
        return items
