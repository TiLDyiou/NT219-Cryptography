import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'services/order-service'))
try:
    from app.api.v1.user.order import router
    print("Import successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
