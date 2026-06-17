export type ScheduleEntry = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  itemsSummary: string;
  rentDate: string;
  eventStartTime: string | null;
};

export type ScheduleSourceItem = {
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string | null;
    storeId: string;
    eventStartTime: string | null;
  };
  product: { name: string };
  variant: { name: string | null } | null;
  quantity: number;
  rentDate: Date;
};

export type ScheduleDay = {
  start: Date;
  end: Date;
};

export function buildScheduleDay(date: Date): ScheduleDay {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function buildScheduleEntries(
  items: ScheduleSourceItem[],
  day: ScheduleDay,
  storeId: string,
): ScheduleEntry[] {
  const inRange = items.filter(
    (item) =>
      item.order.storeId === storeId &&
      item.rentDate >= day.start &&
      item.rentDate <= day.end,
  );

  const orderGroups = new Map<
    string,
    {
      order: ScheduleSourceItem["order"];
      items: ScheduleSourceItem[];
    }
  >();

  for (const item of inRange) {
    const group = orderGroups.get(item.order.id);
    if (group) {
      group.items.push(item);
    } else {
      orderGroups.set(item.order.id, { order: item.order, items: [item] });
    }
  }

  const entries: ScheduleEntry[] = [];

  for (const [, group] of orderGroups) {
    const itemsSummary = group.items
      .map((item) => {
        const name = item.variant?.name
          ? `${item.product.name} (${item.variant.name})`
          : item.product.name;
        return item.quantity > 1 ? `${item.quantity}× ${name}` : name;
      })
      .join(", ");

    entries.push({
      orderId: group.order.id,
      customerName: group.order.customerName,
      customerPhone: group.order.customerPhone,
      deliveryAddress: group.order.deliveryAddress,
      itemsSummary,
      rentDate: group.items[0].rentDate.toISOString(),
      eventStartTime: group.order.eventStartTime,
    });
  }

  entries.sort((left, right) => left.customerName.localeCompare(right.customerName));

  return entries;
}
