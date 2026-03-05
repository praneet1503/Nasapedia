import argparse

import modal


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update Modal autoscaler settings for the backend service."
    )
    parser.add_argument(
        "--app-name",
        default="nasa-techport-backend-v3",
        help="Modal App name.",
    )
    parser.add_argument(
        "--function-name",
        default="backend",
        help="Function name registered in Modal.",
    )
    parser.add_argument(
        "--min-containers",
        type=int,
        default=1,
        help="Minimum number of warm containers to keep running.",
    )
    parser.add_argument(
        "--scaledown-window",
        type=int,
        default=3600,
        help="Seconds to wait before scaling down idle containers.",
    )
    parser.add_argument(
        "--max-containers",
        type=int,
        default=None,
        help="Optional max container cap.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    kwargs = {
        "min_containers": args.min_containers,
        "scaledown_window": args.scaledown_window,
    }
    if args.max_containers is not None:
        kwargs["max_containers"] = args.max_containers

    with modal.enable_output():
        function_ref = modal.Function.from_name(args.app_name, args.function_name)
        function_ref.update_autoscaler(**kwargs)

    print(
        "Updated autoscaler:",
        {
            "app_name": args.app_name,
            "function_name": args.function_name,
            **kwargs,
        },
    )


if __name__ == "__main__":
    main()
