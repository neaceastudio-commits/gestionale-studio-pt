// Propagate prescription changes, never recorded performances.
export function propagateForward(previous: any, program: any, week: number) {
  for (const day of program.days) {
    const before = previous.days.find((d: any) => d.key === day.key);
    if (!before) {
      for (const w of program.weeks.filter((w: number) => w > week)) {
        day.exercisesByWeek[w] = structuredClone(day.exercisesByWeek[week] || []);
        day.groupsByWeek[w] = structuredClone(day.groupsByWeek[week] || []);
      }
      continue;
    }
    for (const field of ['exercisesByWeek', 'groupsByWeek']) {
      const old = before[field][week] || [], current = day[field][week] || [];
      if (JSON.stringify(old) === JSON.stringify(current)) continue;
      const removed = new Set(old.filter((e: any) => !current.some((n: any) => n.key === e.key)).map((e: any) => e.key));
      for (const w of program.weeks.filter((w: number) => w > week)) {
        let future = (day[field][w] || []).filter((e: any) => !removed.has(e.key));
        current.forEach((item: any, index: number) => {
          const prior = old.find((e: any) => e.key === item.key);
          let target = future.find((e: any) => e.key === item.key);
          if (!target) { future.splice(Math.min(index, future.length), 0, structuredClone(item)); return; }
          for (const key of new Set([...Object.keys(prior || {}), ...Object.keys(item)])) {
            if (key === 'key' || JSON.stringify(prior?.[key]) === JSON.stringify(item[key])) continue;
            // Explicit multiweek actions (e.g. progression) keep their own future values.
            const oldFuture = before[field][w]?.find((e: any) => e.key === item.key);
            if (JSON.stringify(target[key]) !== JSON.stringify(oldFuture?.[key])) continue;
            if (item[key] === undefined) delete target[key];
            else target[key] = structuredClone(item[key]);
          }
        });
        const oldOrder = old.map((e: any) => e.key).join('|');
        const newOrder = current.map((e: any) => e.key);
        if (oldOrder !== newOrder.join('|')) future.sort((a: any,b: any) => {
          const ai=newOrder.indexOf(a.key),bi=newOrder.indexOf(b.key);
          return (ai<0?9999:ai)-(bi<0?9999:bi);
        });
        day[field][w] = future;
      }
    }
  }
}
