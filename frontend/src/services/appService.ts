import './api/registerCacheHooks'

import { businessApi } from './api/businessApi/businessApi'
import { customersApi } from './api/customersApi/customersApi'
import { dashboardApi } from './api/dashboardApi/dashboardApi'
import { ordersApi } from './api/ordersApi/ordersApi'
import { teamApi } from './api/teamApi/teamApi'

class AppService {
  dashboard = {
    stats: () => dashboardApi.stats(),
    summary: () => dashboardApi.summary(),
    summarySync: () => dashboardApi.summarySync(),
  }

  customers = {
    list: (q?: string) => customersApi.list(q),
    listSync: (q?: string) => customersApi.listSync(q),
    listActive: (q?: string) => customersApi.listActive(q),
    listActiveSync: (q?: string) => customersApi.listActiveSync(q),
    get: (id: string) => customersApi.get(id),
    getSync: (id: string) => customersApi.getSync(id),
    create: (data: Parameters<typeof customersApi.create>[0]) => customersApi.create(data),
    update: (id: string, data: Parameters<typeof customersApi.update>[1]) => customersApi.update(id, data),
    disable: (id: string) => customersApi.disable(id),
    enable: (id: string) => customersApi.enable(id),
    orders: (id: string) => customersApi.orders(id),
    templates: () => customersApi.templates(),
    getMeasurement: (id: string, garment: string) => customersApi.getMeasurement(id, garment),
    saveMeasurement: (id: string, garment: string, data: Parameters<typeof customersApi.saveMeasurement>[2]) =>
      customersApi.saveMeasurement(id, garment, data),
  }

  orders = {
    list: () => ordersApi.list(),
    listSync: () => ordersApi.listSync(),
    get: (id: string) => ordersApi.get(id),
    getSync: (id: string) => ordersApi.getSync(id),
    create: (data: any) => ordersApi.create(data),
    update: (id: string, data: any) => ordersApi.update(id, data),
    paymentInfo: (id: string) => ordersApi.paymentInfo(id),
    payCash: (id: string, amount: number) => ordersApi.payCash(id, amount),
    markPaid: (id: string) => ordersApi.markPaid(id),
    phonePeInitiate: (id: string) => ordersApi.phonePeInitiate(id),
    phonePeSync: (id: string) => ordersApi.phonePeSync(id),
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

