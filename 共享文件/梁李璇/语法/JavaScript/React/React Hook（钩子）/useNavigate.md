```
import { useNavigate } from "react-router-dom";//导入
function Article(){
  const navigate = useNavigate();
  return(
    <div>
      <h1>Article</h1>
      <button onClick={()=>{navigate("/login")}}>跳转到登录页</button>
    </div>
  )
}
export default Article;
```