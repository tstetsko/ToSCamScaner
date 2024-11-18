# Camarilla Pivot Points Scaner
# Based on Thor's book 'A Complete Day Trading System', CAMS with pre-market data, 
# Some code based on code by SleepyZ & Nube
# https://usethinkscript.com/threads/pivot-day-trading-system-for-thinkorswim.12988/
# WITH PREMARKET DATA is not aplicable on daily period 
declare once_per_bar;

input aggregationPeriod = {default "DAY", "WEEK", "MONTH"};
def length = 1;

Assert(length > 0, "'length' should be positive: " + length);


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

#WITHOUT PM DATA ----------------------------------------------------------
def R4 = closeValue + range * (1.1) / 2;
def R3 = closeValue + range * (1.1) / 4;
def S3 = closeValue - range * (1.1) / 4;
def S4 = closeValue - range * (1.1) / 2;

# Get Daily ATR
def ATR_averageType = AverageType.WILDERS; 
def ATR_length = 14;
def ATR = MovingAverage(ATR_averageType, TrueRange( high, close, low), ATR_length);

# Scaner Conditions
def closeTwoDaysAgo = close(period = "Day")[2];
def closePrevDay = close(period = "Day")[1];
def isLowRange =  closePrevDay < closeTwoDaysAgo;
def isHigherRange = closePrevDay > closeTwoDaysAgo;

def ATR5Percent = ATR * 0.05;
def ATR20Percent = ATR * 0.2;

# R3 scan Conditions defenition
def R3ScanStartRange = R3 - ATR5Percent;
def R3ScanEndFilter = high < R3 + ATR5Percent;
def currentPrice = close();
def R3InitialVolatilityLimit = low > open - ATR20Percent;
def R3DirectionalMoveFilter = low > S3 and R3InitialVolatilityLimit;
def R3scanConditions = isLowRange
    and R3DirectionalMoveFilter
    and currentPrice > R3ScanStartRange 
    and R3ScanEndFilter;

#S3 scan Conditions defenition
def S3ScanStartRange = S3 + ATR5Percent;
def S3ScanEndFilter = low > S3 - ATR5Percent;
def S3InitialVolatilityLimit = high < open + ATR20Percent;
def S3DirectionalMoveFilter = high < R3 and S3InitialVolatilityLimit;
def S3scanConditions = isHigherRange
    and S3DirectionalMoveFilter
    and currentPrice < S3ScanStartRange 
    and S3ScanEndFilter;

#S4 scan Conditions defenition
def S4ScanStartRange = S4 + ATR5Percent;
def S4ScanEndFilter = low > S4 - ATR5Percent;

def S4scanConditions = isLowRange
    and currentPrice < S4ScanStartRange
    and S4ScanEndFilter;

#R4 scan Conditions defenition
def R4ScanStartRange = R4 - ATR5Percent;
def R4ScanEndFilter = high < R4 + ATR5Percent;

def R4scanConditions = isHigherRange
    and currentPrice > R4ScanStartRange
    and R4ScanEndFilter;

#scan
plot scanCondition = R3scanConditions or S3scanConditions or R4scanConditions or S4scanConditions;