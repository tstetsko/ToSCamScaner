# Camarilla Pivot Points Scaner
# Based on Thor's book 'A Complete Day Trading System', CAMS with pre-market data, 
# Some code based on code by SleepyZ & Nube
# https://usethinkscript.com/threads/pivot-day-trading-system-for-thinkorswim.12988/

declare once_per_bar;

def aggregationPeriod = {default "DAY", "WEEK", "MONTH"};
def length = 1;
def ShowBubbles = yes;
def ShowPricesInBubbles = yes;
def locate_bubbles_at = {default Expansion, Time};
def locate_bubbles_at_time = 600;
def BarsFromExpansion = 2;
def PMD_Indicator_Label = yes;
def ShowCams = {default "Both", "w/o Only", "Auto", "w/Only"};
def hide_Floor_Pivots = no;
def hide_s4a_r4a = yes;
def hide_s1_r1 = yes;
def hide_s2_r2 = yes;
def hide_s5_r5 = no;
def lines = {default horizontal, dashes, points, triangles, squares};
def HasNoGlobeX = no;

Assert(length > 0, "'length' should be positive: " + length);

def timeopen = SecondsFromTime(locate_bubbles_at_time) == 0;
def isExpansion = locate_bubbles_at == locate_bubbles_at.Expansion and IsNaN(close);
def firstExpansionBar = if !IsNaN(close[-1]) and isExpansion then 1 else if isExpansion then firstExpansionBar[1] + 1 else 0;
def BubbleLocation = if locate_bubbles_at == locate_bubbles_at.Time then timeopen else isExpansion and firstExpansionBar == BarsFromExpansion;

def yyyymmdd = GetYYYYMMDD();
def month = GetYear() * 12 + GetMonth();
def day_number = DaysFromDate(First(yyyymmdd)) + GetDayOfWeek(First(yyyymmdd));

def period;
switch (aggregationPeriod) {
case DAY:
    period = CountTradingDays(Min(First(yyyymmdd), yyyymmdd), yyyymmdd) - 1;
case WEEK:
    period = Floor(day_number / 7);
case MONTH:
    period = Floor(month - First(month));
}

def count = CompoundValue(1, if period != period[1] then (count[1] + period - period[1]) % length else count[1], 0);
def start =  CompoundValue(1, count < count[1] + period - period[1], yes);

def highValue = if start then Highest(high(period = aggregationPeriod), length)[1] else if highValue[1] != 0 then highValue[1] else Double.NaN;

def lowValue = if start then Lowest(low(period = aggregationPeriod), length)[1] else if lowValue[1] != 0 then lowValue[1] else Double.NaN;
def closeValue = if start then close(period = aggregationPeriod)[1] else closeValue[1];
def range = highValue - lowValue;

#PMD Indicator Label on Chart ----------------------------------------------

def na = Double.NaN;
def bn = BarNumber();
def h  = high;
def l  = low;

Script prior {
# subscript for getting prior value of a BarNumber() defined variable
    input prior = close;
    def   priorOf = if prior != prior[1] then prior[1] else priorOf[1];
    plot  priorBar = priorOf;
}
 
# variables
def cb   = HighestAll(if !IsNaN(h) then bn else na);
def time = GetTime();
def rts  = RegularTradingStart(GetYYYYMMDD());
def rte  = RegularTradingEnd(GetYYYYMMDD());

def RTH = if   time crosses above rts
          then bn else if time <= rts then bn else RTH[1];

def globex = if   time crosses below rte
             then bn else globex[1];

def priorRTH    = prior(RTH);
def priorGlobex = prior(globex);
def hRTH  = HighestAll(RTH);
def hGX   = HighestAll(globex);
def hPRTH = HighestAll(priorRTH);
def hPGX  = HighestAll(priorGlobex);

def gXhigh = HighestAll(if   bn >= hGX && bn < hRTH
                        then h else if hRTH < hGX && bn >= hGX
                                    then h else na);
def gXlow = LowestAll(if   bn >= hGX && bn < hRTH
                      then l else if hRTH < hGX && bn >= hGX
                                  then l else na);

def priorGBXhigh = HighestAll(if   bn >= hPGX
                              &&   bn <  if   hGX < hRTH
                                         then hGX
                                         else hPGX
                              then h else na);
def priorGBXlow = LowestAll(if   bn >= hPGX
                            &&   bn <  if   hGX < hRTH
                                       then hGX
                                       else hPGX
                            then l else na);
 
def displace = -1;
def PDHigh = Highest(high(period = aggregationPeriod)[-displace], length);
def PDLow = Lowest(low(period = aggregationPeriod)[-displace], length);
def PD_Close = close(period = aggregationPeriod)[1];

def tm = SecondsFromTime(00);
Def gxClose = if tm crosses below tm[1] then close[1] else gxClose[1];

def wPMD = if (HasNoGlobeX and gxclose == PD_Close) then 0 else if gXhigh > PDHigh or gXlow < PDLow then 1 else 0;

#WITHOUT PM DATA ----------------------------------------------------------

def R4 = closeValue + range * (1.1) / 2;
def R3 = closeValue + range * (1.1) / 4;
def S3 = closeValue - range * (1.1) / 4;
def S4 = closeValue - range * (1.1) / 2;

#WITH PREMARKET DATA-------------------------------------------------------

def rangew = priorGBXhigh - priorGBXlow;

def R4w = gxClose + rangew * (1.1) / 2;
def R3w = gxClose + rangew * (1.1) / 4;
def S3w = gxClose - rangew * (1.1) / 4;
def S4w = gxClose - rangew * (1.1) / 2;

# Scaner Conditions
def closeTwoDaysAgo = close(period = "Day")[2];
def closePrevDay = close(period = "Day")[1];
def isLowRange =  closePrevDay < closeTwoDaysAgo;
def isHigherRange = closePrevDay > closeTwoDaysAgo;

def priceOffset = 0.2
def R3Offset = R3 - priceOffset;
def R3wOffset = R3w - priceOffset;

isLowRange and (high is greater than R3Offset or high is greater than R3wOffset)
