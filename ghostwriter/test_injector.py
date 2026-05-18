from unittest.mock import patch

from ghostwriter import injector


def test_force_clipboard_paste_calls_clipboard_path():
    with patch("ghostwriter.injector._inject_clipboard", return_value={"ok": True, "mode": "clipboard", "text": "abc"}) as inject_clipboard_mock:
        result = injector.force_clipboard_paste("abc")
        assert result["ok"] is True
        assert result["mode"] == "clipboard"
        inject_clipboard_mock.assert_called_once_with("abc")


def test_inject_text_uses_clipboard_for_cjk():
    with patch("ghostwriter.injector._inject_clipboard", return_value={"ok": True, "mode": "clipboard", "text": "你好"}) as inject_clipboard_mock:
        with patch("ghostwriter.injector._inject_ascii") as inject_ascii_mock:
            result = injector.inject_text("你好")
            assert result["ok"] is True
            assert result["mode"] == "clipboard"
            inject_clipboard_mock.assert_called_once_with("你好")
            inject_ascii_mock.assert_not_called()

