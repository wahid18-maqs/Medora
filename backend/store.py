from typing import List, Dict, Any

# Shared in-memory fallback stores when MongoDB is unconfigured or unreachable
IN_MEMORY_REPORTS: List[Dict[str, Any]] = []
IN_MEMORY_PROFILES: Dict[str, Dict[str, Any]] = {}
IN_MEMORY_USERS: Dict[str, Dict[str, Any]] = {}
