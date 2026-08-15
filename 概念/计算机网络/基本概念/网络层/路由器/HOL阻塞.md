---
aliases:
  - 队头阻塞
  - Head-of-Line Blocking
---

### HOL 队头阻塞

![[Pasted image 20251017114825.png]]

- 输入端口使用 FIFO 队列；
- 队头分组等待繁忙输出端口；
- 其后本可发往空闲端口的分组也被阻塞；
- 可用虚拟输出队列 VOQ 缓解。

上位：[[路由器]]。

