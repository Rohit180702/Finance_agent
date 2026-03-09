"""
Redis client singleton for conversation memory and caching.
"""

import redis
from typing import Optional
from app.core.config import settings


class RedisClient:
    """Singleton Redis client for the application"""

    _instance: Optional[redis.Redis] = None
    _checkpointer_instance: Optional[redis.Redis] = None

    @classmethod
    def get_client(cls, decode_responses: bool = True) -> redis.Redis:
        """
        Get or create Redis client instance.

        Args:
            decode_responses: Whether to decode responses to strings (default: True)
                             Set to False for LangGraph checkpointer (needs bytes)

        Returns:
            redis.Redis: Redis client instance
        """
        # Use different instances for different decode_responses settings
        if decode_responses:
            if cls._instance is None:
                cls._instance = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=settings.REDIS_DB,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )

                # Test connection
                try:
                    cls._instance.ping()
                    print(f"✅ Redis connected: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
                except redis.ConnectionError as e:
                    print(f"❌ Redis connection failed: {e}")
                    print("⚠️  Make sure Redis is running: docker-compose up -d redis")
                    raise

            return cls._instance
        else:
            # Separate instance for checkpointer (needs bytes, not strings)
            if cls._checkpointer_instance is None:
                cls._checkpointer_instance = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=settings.REDIS_DB,
                    decode_responses=False,  # RedisSaver needs bytes
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )

                # Test connection
                try:
                    cls._checkpointer_instance.ping()
                    print(f"✅ Redis checkpointer connected: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
                except redis.ConnectionError as e:
                    print(f"❌ Redis checkpointer connection failed: {e}")
                    print("⚠️  Make sure Redis is running: docker-compose up -d redis")
                    raise

            return cls._checkpointer_instance

    @classmethod
    def close(cls):
        """Close Redis connections"""
        if cls._instance:
            cls._instance.close()
            cls._instance = None
        if cls._checkpointer_instance:
            cls._checkpointer_instance.close()
            cls._checkpointer_instance = None


# Convenience functions
def get_redis_client() -> redis.Redis:
    """Get Redis client instance (with decode_responses=True)"""
    return RedisClient.get_client(decode_responses=True)


def get_redis_checkpointer_client() -> redis.Redis:
    """Get Redis client instance for LangGraph checkpointer (with decode_responses=False)"""
    return RedisClient.get_client(decode_responses=False)

