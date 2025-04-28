from fastapi import Depends

from .database import get_session

# Cleaned up: Removed commented-out auth constants/functions

# Removed SECRET constant
# Removed UserManager class
# Removed get_user_manager function
# Removed get_user_db function
# Removed bearer_transport
# Removed get_jwt_strategy function
# Removed auth_backend 