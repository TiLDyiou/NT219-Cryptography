from app.application.use_cases.event_mapping import command_from_order_event


class HandleOrderEventUseCase:
    def __init__(self, send_notification_use_case):
        self._send = send_notification_use_case

    async def execute(self, envelope: dict):
        command = command_from_order_event(envelope)
        if command is None:
            return None
        return await self._send.execute(command)
