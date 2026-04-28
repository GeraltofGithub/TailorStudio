import { businessApi } from './api/businessApi/businessApi'
import { customersApi } from './api/customersApi/customersApi'
import { dashboardApi } from './api/dashboardApi/dashboardApi'
import { ordersApi } from './api/ordersApi/ordersApi'
import { teamApi } from './api/teamApi/teamApi'

class AppService {
  dashboard = {
    stats: () => dashboardApi.stats(),
  }

  customers = {
    list: (q?: string) => customersApi.list(q),
    listActive: (q?: string) => customersApi.listActive(q),
    get: (id: number) => customersApi.get(id),
    create: (data: Parameters<typeof customersApi.create>[0]) => customersApi.create(data),
    update: (id: number, data: Parameters<typeof customersApi.update>[1]) => customersApi.update(id, data),
    disable: (id: number) => customersApi.disable(id),
    enable: (id: number) => customersApi.enable(id),
    orders: (id: number) => customersApi.orders(id),
    templates: () => customersApi.templates(),
    getMeasurement: (id: number, garment: string) => customersApi.getMeasurement(id, garment),
    saveMeasurement: (id: number, garment: string, data: Parameters<typeof customersApi.saveMeasurement>[2]) =>
      customersApi.saveMeasurement(id, garment, data),
  }

  orders = {
    list: () => ordersApi.list(),
    get: (id: number) => ordersApi.get(id),
    create: (data: any) => ordersApi.create(data),
    update: (id: number, data: any) => ordersApi.update(id, data),
    paymentInfo: (id: number) => ordersApi.paymentInfo(id),
    payCash: (id: number, amount: number) => ordersApi.payCash(id, amount),
    markPaid: (id: number) => ordersApi.markPaid(id),
    phonePeInitiate: (id: number) => ordersApi.phonePeInitiate(id),
    phonePeSync: (id: number) => ordersApi.phonePeSync(id),
  }

  team = {
    list: () => teamApi.team(),
    rotateJoinCode: () => teamApi.rotateJoinCode(),
  }

  business = {
    update: (data: Parameters<typeof businessApi.update>[0]) => businessApi.update(data),
  }
}

export const appService = new AppService()

