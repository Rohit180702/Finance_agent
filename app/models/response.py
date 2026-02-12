from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class PeriodConfig(BaseModel):
    """Configuration for a data period"""
    value: str
    label: str
    description: str
    recommended_for: List[str]


class IntervalConfig(BaseModel):
    """Configuration for an interval"""
    value: str
    label: str
    description: str
    limitation: Optional[str] = None
    max_period_days: Optional[int] = None


class StrategyConfig(BaseModel):
    """Configuration for a trading strategy"""
    name: str
    data_period: str
    interval: str
    description: str


class ConfigResponse(BaseModel):
    """Response model for configuration endpoint"""
    success: bool = True
    config: Dict[str, Any] = Field(..., description="Market data configuration")


class CalculateIndicatorResponse(BaseModel):
    """Response model for indicator calculation"""
    success: bool
    response: str = Field(..., description="Human-readable response from the agent")
    params: Dict[str, Any] = Field(..., description="Parameters used for calculation")
    warning: Optional[str] = Field(None, description="Warning message if any")


class AnalyzeResponse(BaseModel):
    """Response model for natural language analysis"""
    success: bool
    response: str = Field(..., description="Agent's response to the query")
    query: str = Field(..., description="Original user query")


class ErrorResponse(BaseModel):
    """Response model for errors"""
    success: bool = False
    error: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

