class BasicError(Exception):
    def __init__(self, msg, detail=None, code=None, **kwargs) -> None:
        self.msg_template = msg
        self.detail_template = detail
        self.params = kwargs
        self.code = code

        self.msg = msg.format(**kwargs)
        if detail is None:
            self.detail = None
        else:
            self.detail = detail.format(**kwargs)

        super().__init__(self.msg)
