import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all non-deleted FDs with their transaction logs in one query
    const fds = await prisma.fD.findMany({
      where: { 
        isDeleted: false,
        familyId: (session.user as any).familyId
      },
      include: {
        transactions: true,
      },
    });

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Summary calculations
    let totalActiveCount = 0;
    let totalActivePrincipal = 0;
    let totalActiveMaturity = 0;
    let totalActiveInterest = 0;
    
    let maturedCount = 0;
    let renewedCount = 0;
    let withdrawnCount = 0;
    
    let totalInterestEarnedAllTime = 0; // interest earned from matured, renewed, withdrawn FDs

    const upcoming7Days: any[] = [];
    const upcoming30Days: any[] = [];
    let latestToMature: any = null;

    const holderMap = new Map<string, { count: number; principal: number; interest: number }>();

    fds.forEach((fd) => {
      // All-time interest earned calculations
      if (fd.status === 'MATURED' || fd.status === 'RENEWED' || fd.status === 'WITHDRAWN') {
        totalInterestEarnedAllTime += fd.interestEarned;
      }

      // Group by holder
      const holder = fd.holderName || 'Unknown';
      const currentHolder = holderMap.get(holder) || { count: 0, principal: 0, interest: 0 };
      
      if (fd.status === 'ACTIVE') {
        totalActiveCount++;
        totalActivePrincipal += fd.principalAmount;
        totalActiveMaturity += fd.withdrawAmount;
        totalActiveInterest += fd.interestEarned;
        
        currentHolder.count++;
        currentHolder.principal += fd.principalAmount;
        currentHolder.interest += fd.interestEarned;

        // Check for upcoming maturities
        const endDate = new Date(fd.endDate);
        if (endDate >= now) {
          if (endDate <= sevenDaysFromNow) {
            upcoming7Days.push(fd);
          }
          if (endDate <= thirtyDaysFromNow) {
            upcoming30Days.push(fd);
          }

          // Latest/next FD to mature
          if (!latestToMature || endDate < new Date(latestToMature.endDate)) {
            latestToMature = fd;
          }
        }
      } else if (fd.status === 'MATURED') {
        maturedCount++;
      } else if (fd.status === 'RENEWED') {
        renewedCount++;
      } else if (fd.status === 'WITHDRAWN') {
        withdrawnCount++;
      }
      
      holderMap.set(holder, currentHolder);
    });

    // Sort upcoming lists by end date
    upcoming7Days.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    upcoming30Days.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    // Holder distribution data
    const holderDistribution = Array.from(holderMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      totalPrincipal: Number(data.principal.toFixed(2)),
      totalInterest: Number(data.interest.toFixed(2)),
    }));

    // Recently added FDs (last 5)
    const recentlyAdded = [...fds]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 5);

    // Monthly maturity chart (next 12 months for active FDs)
    const monthlyMaturityMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyMaturityMap.set(key, 0);
    }

    fds.forEach((fd) => {
      if (fd.status === 'ACTIVE') {
        const endDate = new Date(fd.endDate);
        if (endDate >= now) {
          const key = endDate.toLocaleString('default', { month: 'short', year: 'numeric' });
          if (monthlyMaturityMap.has(key)) {
            monthlyMaturityMap.set(key, (monthlyMaturityMap.get(key) || 0) + fd.withdrawAmount);
          }
        }
      }
    });

    const monthlyMaturityChart = Array.from(monthlyMaturityMap.entries()).map(([month, amount]) => ({
      month,
      amount: Number(amount.toFixed(2)),
    }));

    // Active vs Matured chart (All statuses breakdown)
    const activeVsMaturedChart = [
      { status: 'Active', count: totalActiveCount, amount: Number(totalActivePrincipal.toFixed(2)) },
      { status: 'Matured', count: maturedCount, amount: Number(fds.filter(f => f.status === 'MATURED').reduce((acc, f) => acc + f.principalAmount, 0).toFixed(2)) },
      { status: 'Renewed', count: renewedCount, amount: Number(fds.filter(f => f.status === 'RENEWED').reduce((acc, f) => acc + f.principalAmount, 0).toFixed(2)) },
      { status: 'Withdrawn', count: withdrawnCount, amount: Number(fds.filter(f => f.status === 'WITHDRAWN').reduce((acc, f) => acc + f.principalAmount, 0).toFixed(2)) },
    ];

    // Portfolio Growth Over Time (cumulative active principal based on start dates)
    const growthMap = new Map<string, number>();
    
    // Sort all FDs by start date to construct portfolio timeline
    const sortedFds = [...fds].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    let runningPrincipalSum = 0;
    const growthOverTime = sortedFds.map((fd) => {
      const dateStr = new Date(fd.startDate).toLocaleString('default', { month: 'short', year: 'numeric' });
      
      if (fd.status === 'ACTIVE') {
        runningPrincipalSum += fd.principalAmount;
      } else if (fd.status === 'WITHDRAWN') {
        // Decrement when withdrawn, if start is inside this, but for simplicity, we show standard cumulative additions
        // Or we can just build active additions timeline
      }

      return {
        date: dateStr,
        dateObj: new Date(fd.startDate),
        principal: fd.principalAmount,
        cumulative: runningPrincipalSum,
      };
    });

    // Group growthOverTime by month to keep chart clean
    const groupedGrowthMap = new Map<string, { date: string, dateObj: Date, cumulative: number }>();
    growthOverTime.forEach((item) => {
      const key = item.date;
      const existing = groupedGrowthMap.get(key);
      if (!existing || item.dateObj > existing.dateObj) {
        groupedGrowthMap.set(key, { date: item.date, dateObj: item.dateObj, cumulative: Number(item.cumulative.toFixed(2)) });
      }
    });

    const growthChartData = Array.from(groupedGrowthMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(item => ({ date: item.date, amount: item.cumulative }));

    return NextResponse.json({
      summary: {
        activeCount: totalActiveCount,
        activePrincipal: Number(totalActivePrincipal.toFixed(2)),
        activeMaturity: Number(totalActiveMaturity.toFixed(2)),
        activeInterestEarned: Number(totalActiveInterest.toFixed(2)),
        maturedCount,
        renewedCount,
        withdrawnCount,
        allTimeInterestEarned: Number((totalActiveInterest + totalInterestEarnedAllTime).toFixed(2)),
      },
      upcomingMaturities: {
        next7Days: upcoming7Days,
        next30Days: upcoming30Days,
        count7Days: upcoming7Days.length,
        count30Days: upcoming30Days.length,
      },
      latestToMature,
      recentlyAdded,
      charts: {
        holderDistribution,
        monthlyMaturityChart,
        activeVsMaturedChart,
        growthChartData,
      },
    });
  } catch (error: any) {
    console.error('Error computing dashboard statistics:', error);
    return NextResponse.json({ error: 'Failed to compute dashboard statistics' }, { status: 500 });
  }
}
