function distLogo(dist) {
	var logo = document.createElement('span');

	switch (dist) {
		case 'alpine linux':
			logo.className = "fl-alpine";
			logo.style.color = "#0d597f";
		case 'centos':
			logo.className = "fl-centos";
		case 'rhel':
		case 'rhas':
		case 'red hat linux':
			logo.className = "fl-redhat";
			logo.style.color = "#e93442";
		case 'elementary os':
			logo.className = "fl-elementary";
		case 'gentoo linux':
			logo.className = "fl-gentoo";
			logo.style.color = "#514575";
		case 'mandriva linux':
			logo.className = "fl-mandriva";
		case 'raspbian':
			logo.className = "fl-raspberry-pi";
			logo.style.color = "#d6264f";
		case 'slackware':
			logo.className = "fl-slackware";
		case 'aosc':
			logo.className = "fl-aosc";
		case 'coreos':
			logo.className = "fl-coreos";
		case 'fedora':
			logo.className = "fl-fedora";
			logo.style.color = "#294172";
		case 'linux mint':
			logo.className = "fl-linuxmint";
			logo.style.color = "#86ce3e";
		case 'manjaro':
			logo.className = "fl-manjaro";
			logo.style.color = "#37bf5d";
		case 'apple':
		case 'osx':
		case 'macos':
		case 'darwin':
			logo.className = "fl-apple";
		case 'nixos':
			logo.className = "fl-nixos";
		case 'sabayon':
			logo.className = "fl-sabayon";
		case 'debian':
			logo.className = "fl-debian";
			logo.style.color = "#d70751";
		case 'ubuntu':
		case 'ubuntu linux':
			logo.className = "fl-ubuntu-inverse";
			logo.style.color = "#dd4814";
		case 'arch linux':
			logo.className = "fl-archlinux";
			logo.style.color = "#1793d1";
		case 'freebsd':
			logo.className = "fl-freebsd";
			logo.style.color = "#eb0028";
		case 'mageia':
			logo.className = "fl-mageia";
		case 'opensuse':
			logo.className = "fl-opensuse";
			logo.style.color = "#73ba25";
		default:
			logo.className = "fl-tux"
	}

	logo.className += " node_status_logo";

	return logo.outerHTML;
}

function getDists(arr) {
    var dists = arr.filter(function(e, i) {
		var pred = e.startsWith('Dist: ');
		if (pred) {
			arr[i] = "";
		}
		return pred;
	});
	dists = dists.map(function(e) {
		return e.replace("Dist: ","").toLowerCase();
    });
    return dists;
}

function addFontLinux() {
    var fontLinux = document.createElement("link");
    fontLinux.rel="stylesheet";
    fontLinux.href="/node_modules/font-linux/assets/font-linux.css";
    document.head.appendChild(fontLinux);
}
