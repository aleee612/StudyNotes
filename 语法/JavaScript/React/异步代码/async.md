`async` 是 JavaScript / TypeScript / ArkTS 中用来声明“异步函数”的关键字。

简单点说，它告诉系统：“这个函数**不是立刻就能得到结果的**，它可能要等一会儿，比如等网络、文件、定时器……”。所以它会**返回一个 Promise 对象**。

---

### 🌟 用法举例：

```
async function sayHello() {
  return "Hello"
}
```

上面这个函数，其实等同于：

```
function sayHello() {
  return Promise.resolve("Hello")
}
```

---

### 📌 async 函数的特点：

1. **返回的是 Promise**：

```
let result = sayHello()
console.log(result) // Promise { "Hello" }
```

2. **可以用** `await` **等待别的异步操作**：

```
async function main() {
  let response = await fetch("https://example.com")  // 等待 fetch 完成
  let data = await response.json()
  console.log(data)
}
```

---

### ✅ async 通常配合 await 使用：

```
async function getData() {
  let result = await someAsyncFunction()
  console.log("拿到数据：", result)
}
```

如果不用 `async/await`，上面这段代码就得用 `.then()` 来写，看起来会比较乱。

---

### 🧠 总结一句话：

`async` 让你可以写“**看起来是同步的异步代码**”，更清楚、更方便。

---