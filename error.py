class BasicError(Exception):
    def __init__(self, msg, detail=None, code=None, **kwargs) -> None:
        self.msg_template = msg
        self.detail_template = detail
        self.params = kwargs
        self.code = code

        self.msg = msg.format(**kwargs) if kwargs else msg
        if detail is None:
            self.detail = None
        else:
            self.detail = detail.format(**kwargs) if kwargs else detail

        super().__init__(self.msg)
