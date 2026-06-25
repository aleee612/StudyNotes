**后端入口与配置**
- `WmsDemoApplication.java`：Spring Boot 启动入口，负责启动后端并扫描 MyBatis Mapper。
- `GlobalExceptionHandler.java`：全局异常处理，把后端异常统一包装成前端能识别的失败返回。
- `DatabaseMigrationConfig.java`：启动时检查旧数据库缺失字段并自动补列，比如 `supplier_id`、`carrier_id`、`customer_id`。
- `Result.java`：统一接口返回结构，所有接口基本都返回 `code / msg / data`。
- `ApplyStatus.java`：申购单状态枚举，维护待审核、已同意、已驳回等状态码。
**后端登录与工具**
- `LoginDTO.java`：登录请求参数，接收用户名和密码。
- `LoginVO.java`：登录成功后的返回数据，包括用户信息和 token。
- `SysUser.java`：用户实体。
- `SysUserController.java`：用户接口，主要负责登录。
- `SysUserService.java` / `SysUserServiceImpl.java`：用户业务逻辑，校验账号密码。
- `SysUserMapper.java`：用户表 SQL 操作。
- `TokenUtil.java`：生成简单 token。
- `OrderNoUtil.java`：生成业务单号，如 `SQ`、`RK`、`LY`。

**后端基础资料模块**
- `WmsItemType*`：物料分类模块，维护分类名称和备注。
- `WmsItem*`：物料模块，维护物料名称、分类、单位和库存汇总值。
- `WmsWarehouse*`：仓库模块，维护仓库名称、编码和备注。
- `WmsArea*`：库区模块，维护库区名称、编码和所属仓库/上级库区。
- `WmsCustomer*`：客户模块，维护客户联系人、电话、地址，供领用单使用。
- `WmsSupplier*`：供应商模块，维护供货方资料，供申购单使用。
- `WmsCarrier*`：承运商模块，维护运输方资料，供入库单使用。
这里的 `*` 一般包括：
- `Controller`：提供 HTTP 接口。
- `Service`：定义业务方法。
- `ServiceImpl`：实现业务校验和删除保护。
- `Mapper`：写 SQL 访问数据库。
- `Model`：对应数据库表字段。
**后端业务单据模块**
- `WmsApply.java`：申购单单头实体。
- `WmsApplyDetail.java`：申购单明细实体，记录申购物料和数量。
- `WmsApplyController.java`：申购单接口，负责新增、修改、审批、驳回、删除。
- `WmsApplyService.java` / `WmsApplyServiceImpl.java`：申购业务逻辑，负责生成单号、保存明细、限制审批后编辑。
- `WmsApplyMapper.java`：申购单表 SQL。
- `WmsApplyDetailMapper.java`：申购明细表 SQL。
- `WmsReceiptOrder.java`：入库单实体。
- `WmsReceiptOrderController.java`：入库接口，负责新增入库单和验收入库
- `WmsReceiptOrderService.java` / `WmsReceiptOrderServiceImpl.java`：入库业务逻辑，创建时只生成待验收单，验收后增加库区库存
- `WmsReceiptOrderMapper.java`：入库单表 SQL
- `WmsShipmentOrder.java`：领用单实体
- `WmsShipmentOrderController.java`：领用接口，负责新增、审核、确认出库。
- `WmsShipmentOrderService.java` / `WmsShipmentOrderServiceImpl.java`：领用业务逻辑，创建时记录库存快照，出库时扣减库区库存。
- `WmsShipmentOrderMapper.java`：领用单表 SQL。

**后端库存展示**
- `WmsInventoryMapper.java`：库存明细 SQL，按物料和库区维护库存数量
- `ItemInventorySummaryVo.java`：物料库存汇总返回结构
- `ItemInventoryDetailVo.java`：物料在各库区的库存明细返回结构

---

**前端公共文件**
- `ApiConfig.ets`：配置后端接口地址。
- `HttpClient.ets`：统一发送 HTTP 请求，处理返回值。
- `Api.ets`：封装所有后端接口调用，并定义前端用到的数据类型。
- `EntryAbility.ets`：HarmonyOS 应用入口，加载主页面。
- `EntryBackupAbility.ets`：系统生成的备份恢复入口，一般不用改。


**前端页面文件**
- `LoginPage.ets`：登录页。
- `Index.ets`：前端根页面，控制登录态和页面切换。
- `HomePage.ets`：首页工作台，展示核心业务入口、基础资料入口和看板入口。
- `DashboardPage.ets`：数据看板，统计仓库、物料、待办、最近单据和库存预警。


- `ItemTypePage.ets`：物料分类管理页。
- `ItemPage.ets`：物料管理页。
- `WarehousePage.ets`：仓库管理页。
- `AreaPage.ets`：库区管理页。
- `CustomerPage.ets`：客户管理页。
- `SupplierPage.ets`：供应商管理页。
- `CarrierPage.ets`：承运商管理页。
- `ApplyPage.ets`：申购管理页，支持申购单新增、编辑、明细、审批和驳回。
- `ReceiptPage.ets`：入库管理页，支持新增入库单和验收入库。
- `ShipmentPage.ets`：领用管理页，支持新增领用单、审核通过和确认出库。