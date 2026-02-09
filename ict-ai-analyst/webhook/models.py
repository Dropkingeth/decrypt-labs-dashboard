from pydantic import BaseModel
from typing import Optional


class BiasData(BaseModel):
    dir: str                    # "BULL" or "BEAR"
    dol: Optional[float] = None # Draw on Liquidity price
    dol_src: str                # "PDH", "PDL", "BSL x3", "SSL x2", "IPDA 20D High", etc.
    dol_status: str             # "ACTIVE", "DELIVERED", "SEEKING"
    reason: str                 # "ASIA_SWEEP", "MSS", "PD_ZONE"


class StructureData(BaseModel):
    mss: str                    # "BULL", "BEAR", "NONE"
    bos_bull: bool              # Break of Structure bullish this bar
    bos_bear: bool              # Break of Structure bearish this bar
    choch_bull: bool            # Change of Character bullish (MSS up)
    choch_bear: bool            # Change of Character bearish (MSS down)
    displaced: bool             # Displacement candle (large body, small wicks)


class LevelsData(BaseModel):
    pdh: Optional[float] = None        # Previous Day High
    pdl: Optional[float] = None        # Previous Day Low
    asia_h: Optional[float] = None     # Asia session range high
    asia_l: Optional[float] = None     # Asia session range low
    asia_swept_h: bool = False         # Asia high was swept (liquidity taken)
    asia_swept_l: bool = False         # Asia low was swept (liquidity taken)
    eq: Optional[float] = None         # Equilibrium (midpoint of dealing range)
    premium: Optional[float] = None    # Premium zone boundary (upper 25%)
    discount: Optional[float] = None   # Discount zone boundary (lower 25%)
    deal_h: Optional[float] = None     # Dealing range high (HTF highest)
    deal_l: Optional[float] = None     # Dealing range low (HTF lowest)
    ote_h: Optional[float] = None      # OTE zone high (79% retrace)
    ote_l: Optional[float] = None      # OTE zone low (62% retrace)
    ipda20h: Optional[float] = None    # IPDA 20-day high
    ipda20l: Optional[float] = None    # IPDA 20-day low
    ipda40h: Optional[float] = None    # IPDA 40-day high
    ipda40l: Optional[float] = None    # IPDA 40-day low
    ipda60h: Optional[float] = None    # IPDA 60-day high
    ipda60l: Optional[float] = None    # IPDA 60-day low


class NarrativeData(BaseModel):
    state: str                  # "NONE", "DEVELOPING", "ACTIVE"
    dir: str                    # "BULL", "BEAR", "NONE"
    score: int                  # 0-100 conviction score
    sweep: bool                 # Liquidity sweep confirmed
    mss: bool                   # Market Structure Shift confirmed
    entry: bool                 # Entry array available in correct direction
    pd_aligned: bool            # Entry in correct Premium/Discount zone
    kz: bool                    # Currently in a Kill Zone
    confirm: bool               # Has additional confirmation (RejBlock, VI)


class EntryData(BaseModel):
    found: bool                 # Smart Entry winner found
    type: str                   # "OB", "FVG", "BRK", "IFVG"
    dir: str                    # "BULL", "BEAR"
    px: Optional[float] = None  # Entry price (mean/CE of winning array)
    top: Optional[float] = None # Zone top
    bot: Optional[float] = None # Zone bottom
    score: float                # Entry quality score


class ModelData(BaseModel):
    name: str                   # ICT model name
    conf: float                 # Model confidence 0.0-1.0
    flags: str                  # Comma-separated: "SB,OTE,DISCOUNT,KZ"


class SessionData(BaseModel):
    kz: str                     # "LONDON", "NY_AM", "NY_PM", "ASIA", "NONE"
    po3: str                    # "ACCUMULATION", "MANIPULATION", "DISTRIBUTION", "UNKNOWN"
    macro: bool                 # In a macro time window
    sb_time: bool               # In a Silver Bullet time window


class TradingViewPayload(BaseModel):
    v: int                      # Schema version (always 1)
    trigger: str                # What triggered this alert
    sym: str                    # Symbol (e.g., "MNQ1!")
    tf: str                     # Timeframe (e.g., "5")
    px: float                   # Current price
    ts: int                     # Timestamp (Unix ms)
    bias: BiasData
    struct: StructureData
    levels: LevelsData
    narr: NarrativeData
    entry: EntryData
    model: ModelData
    session: SessionData
