from vision.pipeline import VisionPipeline, parse_args


def main() -> None:
    args = parse_args()
    VisionPipeline(args).run()


if __name__ == "__main__":
    main()
