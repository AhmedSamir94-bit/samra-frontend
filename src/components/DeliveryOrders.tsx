import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CustomerOrderStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  received: "تم الاستلام",
  preparing: "جاري التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const NEXT_STATUS: Partial<Record<CustomerOrderStatus, CustomerOrderStatus>> = {
  received: "preparing",
  preparing: "shipped",
  shipped: "delivered",
};

export default function DeliveryOrders() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["delivery-orders"],
    queryFn: () => api.getDeliveryOrders(),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: CustomerOrderStatus;
    }) => api.updateDeliveryOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
    },
  });

  if (isLoading) {
    return <p className="text-sm app-muted">جاري تحميل الطلبات...</p>;
  }

  if (!orders.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center app-muted">
          لا توجد طلبات توصيل حالياً
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const next = NEXT_STATUS[order.status];
        return (
          <Card key={order.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                <Badge variant="secondary">
                  {STATUS_LABELS[order.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>{order.customerName}</strong> — {order.customerPhone}
              </p>
              <p className="app-muted">{order.deliveryAddress}</p>
              <p>
                الإجمالي: <strong>{order.total} ج.م</strong>
              </p>
              <ul className="list-disc ps-5">
                {order.items.map((item, i) => (
                  <li key={i}>
                    {item.name} × {item.quantity}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                {next && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateMutation.mutate({ id: order.id, status: next })
                    }
                    disabled={updateMutation.isPending}
                  >
                    → {STATUS_LABELS[next]}
                  </Button>
                )}
                {order.status !== "cancelled" &&
                  order.status !== "delivered" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateMutation.mutate({
                          id: order.id,
                          status: "cancelled",
                        })
                      }
                      disabled={updateMutation.isPending}
                    >
                      إلغاء
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
