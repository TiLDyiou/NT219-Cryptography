from abc import ABC, abstractmethod


class BankPayoutGateway(ABC):
    @abstractmethod
    async def transfer_to_merchant(
        self,
        merchant_id: str,
        amount: float,
        currency: str,
        settlement_id: str,
    ) -> str:
        """
        Executes bank transfer payout to the merchant.
        Returns the reference transaction ID of the bank payout.
        """
        raise NotImplementedError
