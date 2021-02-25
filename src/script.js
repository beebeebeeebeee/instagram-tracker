const electron = require("electron");
const { ipcRenderer } = electron;

cookies = false;
document.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.send("cookie:check");

  document.querySelector("#form").addEventListener("submit", (e) => {
    e.preventDefault();

    account = document.getElementById("account").value;
    password = document.getElementById("password").value;
    target = document.getElementById("target").value;

    ipcRenderer.send("login:send", cookies, account, password, target);
  });
});

const localSearch = () => {
  target = document.getElementById("target").value;
  ipcRenderer.send("data:check", target);
};

ipcRenderer.on("cookie:check", (e, bool) => {
  if (bool) {
    cookies = true;
    document.getElementById("cookie_login").disabled = false;
    document.getElementById("cookie_login").checked = true;
    document.getElementById("account").disabled = true;
    document.getElementById("password").disabled = true;

    document.querySelector("#cookie_login").addEventListener("click", (e) => {
      if (document.getElementById("cookie_login").checked) {
        cookies = true;
        document.getElementById("account").disabled = true;
        document.getElementById("password").disabled = true;
      } else {
        cookies = false;
        document.getElementById("account").disabled = false;
        document.getElementById("password").disabled = false;
      }
    });
  }
});

ipcRenderer.on("console:push", (e, data) => {
  document.querySelector("#console").hidden = false;
  document.querySelector("#datas").hidden = true;
  document.querySelector("#console").innerHTML =
    data + "<br>" + document.querySelector("#console").innerHTML;
});

ipcRenderer.on("data:push", (e, data) => {
  document.querySelector("#console").hidden = true;
  document.querySelector("#datas").hidden = false;
  set_all(data);
});

function set_all(res) {
  console.log({
    not_follow_back: res.not_follow_back.length,
    follower: res.follower.length,
    following: res.following.length,
  });
  document.querySelector("#datas").innerHTML = ` <div>Updated at: ${new Date(
    res.timestamp
  )}</div>
  <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col" style="width: 30%;">${
              res.not_follow_back.length
            }</th>
            <th scope="col" style="width: 70%;">Not follow you back</th>
          </tr>
        </thead>
        <tbody id="not">
        </tbody>
        </table>
        <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col" style="width: 30%;">${res.follower.length}</th>
            <th scope="col" style="width: 70%;">follower</th>
          </tr>
        </thead>
        <tbody id="follower">
        </tbody>
        </table>
        <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col" style="width: 30%;">${res.following.length}</th>
            <th scope="col" style="width: 70%;">following</th>
          </tr>
        </thead>
        <tbody id="following">
        </tbody>
        </table>`;

  (not_follow_back = ""), (follower = ""), (following = "");
  now = new Date();
  res.not_follow_back.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });
  res.not_follow_back.forEach((e) => {
    not_follow_back += `<tr>
    <td>
      <img src="${e.img}" style="width: 64%;"/>
    </td>
    <td>
      <a href="instagram://user?username=${
        e.name
      }" onclick="this.parentElement.parentElement.style.backgroundColor = '#858b94'">
      ${e.name}<br>
      <span class="badge bg-info">${(
        (now - new Date(e.date)) /
        1000 /
        60
      ).toFixed(2)} Minutes ago<span>
      </a>
    </td>
    </tr>`;
  });
  res.follower.forEach((f) => {
    follower += `<tr>
    <td>
      <img src="${f.img}" style="width: 64%;"/>
    </td>
    <td>
      <a href="instagram://user?username=${f.name}" onclick="this.parentElement.parentElement.style.backgroundColor = '#858b94'">
      ${f.name}
      </a>
    </td>
    </tr>`;
  });
  res.following.forEach((g) => {
    following += `<tr>
    <td>
      <img src="${g.img}" style="width: 64%;"/>
    </td>
    <td>
      <a href="instagram://user?username=${g.name}" onclick="this.parentElement.parentElement.style.backgroundColor = '#858b94'">
      ${g.name}
      </a>
    </td>
    </tr>`;
  });

  document.querySelector("#not").innerHTML = not_follow_back;
  document.querySelector("#follower").innerHTML = follower;
  document.querySelector("#following").innerHTML = following;
}
