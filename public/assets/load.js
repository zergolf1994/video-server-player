class Load {
  async init() {
    const load = document.getElementById("load");
    this.slug = load.getAttribute("slug");
    this.data = await this.getSource();

    if (this.data?.error) {
      console.log(this.data.msg);
      return;
    } else {
      this.player = jwplayer("player");
      this.setupPlayer();
    }
  }
  async getSource() {
    const rawResponse = await fetch(`../h/${this.slug}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    return await rawResponse.json();
  }
  setupPlayer() {
    let slug = this.slug,
      player = this.player.setup(this.data);

    player.once("ready", (e) => {
      console.log("Ready");
    });
  }
}

const start = new Load();
start.init();
