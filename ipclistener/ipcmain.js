const electron = require("electron");
const { app, BrowserWindow, ipcMain, net } = electron;
const puppeteer = require("puppeteer");
var request = require("request-promise");
const fs = require("fs");
const { resolve } = require("path");
const { rejects } = require("assert");
const tough = require("tough-cookie");
const Cookie = tough.Cookie;

const WAIT_TIME = 2000;

ipcMain.on("cookie:check", function (e) {
  win.webContents.send("cookie:check", fs.existsSync("cookies.json"));
});

ipcMain.on("data:check", function (e, name) {
  win.webContents.send("data:push", JSON.parse(fs.readFileSync(`${name}.json`,"utf8")));
});

ipcMain.on("login:send", async function (e, cookies, account, password, target) {
  data = {
    cookies: cookies,
    account: account,
    password: password,
    target: target,
  };
  console.log(data);
  if (!cookies) {
    await login(account, password);
  }
  getNotFollower(target);
});

const sleep = (m) => new Promise((r) => setTimeout(r, m));

const login = async (account, password) => {
  return new Promise(async (resolve, rejects)=>{
    let launchOptions = { headless: false, args: ["--start-maximized"] };
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
  
    // set viewport and user agent just in case
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
    );
    await page.goto("https://www.instagram.com/accounts/login/");
    await page.waitForSelector('input[name="username"]');
  
    // insert account and password
    await page.type('input[name="username"]', account);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
  
    // wait for the one of the main page element loaded.
    await page.waitForSelector(
      "#react-root > section > main > div > div > div > section > div > button"
    );
  
    // get the login cookie from puppeteer and save as cookies.json
    const cookies = await page.cookies();
    const cookieJson = JSON.stringify(cookies);
    fs.writeFileSync("cookies.json", cookieJson);
  
    await browser.close();
    resolve();
  })
};

const getNotFollower = async(name) => {
    TIME_start = new Date();

    user_data = { follower: [], following: [] };
    const cookies = fs.readFileSync("cookies.json","utf8");
    const deserializedCookies = JSON.parse(cookies);

    var cookieJar = request.jar();

    for (element in deserializedCookies) {
      json = deserializedCookies[element];
      const { name, domain } = json;
      json.key = name;
      json.expires =
        json.expires > 0 ? new Date(json.expires * 1000) : "Infinity";
      const cookie = Cookie.fromJSON(json);
      cookieJar.setCookie(cookie.toString(), "https://" + domain);
    }

    try {
      let user = await request({
        url: `https://www.instagram.com/${name}/?__a=1`,
        method: "GET",
        jar: cookieJar,
        header: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
        },
      });

      user = JSON.parse(user);

      user_id = user.graphql.user.id;

      const all_url = {
        follower: `https://www.instagram.com/graphql/query/?query_hash=5aefa9893005572d237da5068082d8d5&variables=%7B%22id%22%3A%22${user_id}%22%2C%22include_reel%22%3Atrue%2C%22fetch_mutual%22%3Atrue%2C%22first%22%3A24%7D`,
        following: `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables=%7B%22id%22%3A%22${user_id}%22%2C%22include_reel%22%3Atrue%2C%22fetch_mutual%22%3Afalse%2C%22first%22%3A24%7D`,
      };

      win.webContents.send("console:push", `format url at: ${Math.floor((new Date() - TIME_start) / 1000)}s`);
      win.webContents.send("console:push", "ready to start fetching"+ JSON.stringify(all_url));

      for (var i = 0; i < 2; i++) {
        who = i == 0 ? "follower" : "following";
        win.webContents.send("console:push", `DOING ${who}!`);
        let res_url = all_url[who];
        win.webContents.send("console:push", "FOUND"+ res_url);

        let index = 0;
        next = "";
        all_data = [];
        end = false;

        while (!end) {
          /* Send the request and get the html content */
          // console.log("REQUEST", res_url + next);
          let res = await request({
            url: res_url + next,
            method: "GET",
            jar: cookieJar,
            header: {
              "User-Agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
            },
          });

          let data = JSON.parse(res).data.user[
            res_url.includes("?query_hash=3dec7e2c57367ef3da3d")
              ? "edge_follow"
              : "edge_followed_by"
          ];
          all_data = all_data.concat(data.edges);

          if (data.page_info.has_next_page != true) end = true;

          if (index == 0) {
            res_url = res_url.replace(
              /fetch_mutual%22%3Atrue/i,
              "fetch_mutual%22%3Afalse"
            );
            // console.log(res_url, "REPLACED TO", res_url.indexOf("first%22"));
            res_url =
              res_url.substring(0, res_url.indexOf("first%22")) +
              "first%22%3A12%2C%22after%22%3A%22";
            // console.log("RENAMED TO", res_url);
          }

          next = data.page_info.end_cursor + "%22%7D";
          index++;

          win.webContents.send("console:push", who+ "records: "+ all_data.length);
          win.webContents.send("console:push", `time at: ${Math.floor((new Date() - TIME_start) / 1000)}s`);
          await sleep(WAIT_TIME);
        }

        for (var j = 0; j < all_data.length; j++) {
          e = all_data[j].node;
          user_data[who].push({ name: e.username, img: e.profile_pic_url });
        }
      }

      let old_data = null;
      if (fs.existsSync(`${name}.json`)) {
        old_data = fs.readFileSync(
          `${name}.json`,
          "utf8"
        );
      }

      let not_follow_back = user_data.following
        .filter((o1) => !user_data.follower.some((o2) => o1.name === o2.name))
        .map((v) => ({ ...v, date: new Date() }));
      let fin_not_follow_back = not_follow_back;

      if (old_data != null) {
        not_follow_back.map((e, i) => {
          JSON.parse(old_data).not_follow_back.map((j) => {
            if (e.name == j.name) {
              fin_not_follow_back[i].date = j.date;
            }
          });
        });
      }

      send_data = {
        timestamp: new Date(),
        not_follow_back: fin_not_follow_back,
        follower: user_data.follower,
        following: user_data.following,
      };

      fs.writeFile(
        `${name}.json`,
        JSON.stringify(send_data),
        function (err, data) {
          if (err) {
          win.webContents.send("console:push", err);
            return console.log(err);
          }
          // console.log(data);
        }
      );

      win.webContents.send("console:push", `finish at: ${Math.floor((new Date() - TIME_start) / 1000)}s`);
      //OK
      win.webContents.send("data:push", send_data);
    } catch (e) {
      console.log(e);
      //failed
    }
}