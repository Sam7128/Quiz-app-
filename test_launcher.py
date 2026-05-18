import types
from unittest.mock import patch

import launcher


def test_run_server_invokes_module():
    with patch("launcher.subprocess.Popen") as popen_mock:
        launcher.run_server()
        args = popen_mock.call_args[0][0]
        assert args[1:] == ["-m", "ghostwriter.server"]


def test_main_menu_only_calls_run_menu():
    with patch("launcher.run_menu") as run_menu_mock:
        with patch("launcher.argparse.ArgumentParser.parse_args", return_value=types.SimpleNamespace(server_only=False, menu_only=True)):
            launcher.main()
            run_menu_mock.assert_called_once()

