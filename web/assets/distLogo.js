function distLogo(dist) {
	var logo = document.createElement('span');

	switch (dist) {
		case 'alpine linux':
			logo.className = "fl-alpine";
			logo.style.color = "#0d597f";
			break;
		case 'centos':
			logo.className = "fl-centos";
			break;
		case 'rhel':
		  break;
		case 'rhas':
		  break;
		case 'red hat linux':
			logo.className = "fl-redhat";
			logo.style.color = "#e93442";
			break;
		case 'elementary os':
			logo.className = "fl-elementary";
			break;
		case 'gentoo linux':
			logo.className = "fl-gentoo";
			logo.style.color = "#514575";
			break;
		case 'mandriva linux':
			logo.className = "fl-mandriva";
			break;
		case 'raspbian':
			logo.className = "fl-raspberry-pi";
			logo.style.color = "#d6264f";
			break;
		case 'slackware':
			logo.className = "fl-slackware";
			break;
		case 'aosc':
			logo.className = "fl-aosc";
			break;
		case 'coreos':
			logo.className = "fl-coreos";
			break;
		case 'fedora':
			logo.className = "fl-fedora";
			logo.style.color = "#294172";
			break;
		case 'linux mint':
			logo.className = "fl-linuxmint";
			logo.style.color = "#86ce3e";
			break;
		case 'manjaro':
			logo.className = "fl-manjaro";
			logo.style.color = "#37bf5d";
			break;
		case 'apple':
		  break;
		case 'osx':
		  break;
		case 'macos':
		  break;
		case 'darwin':
			logo.className = "fl-apple";
			break;
		case 'nixos':
			logo.className = "fl-nixos";
			break;
		case 'sabayon':
			logo.className = "fl-sabayon";
			break;
		case 'debian':
			logo.className = "fl-debian";
			logo.style.color = "#d70751";
			break;
		case 'ubuntu':
		  break;
		case 'ubuntu linux':
			logo.className = "fl-ubuntu-inverse";
			logo.style.color = "#dd4814";
			break;
		case 'arch linux':
			logo.className = "fl-archlinux";
			logo.style.color = "#1793d1";
			break;
		case 'freebsd':
			logo.className = "fl-freebsd";
			logo.style.color = "#eb0028";
			break;
		case 'mageia':
			logo.className = "fl-mageia";
			break;
		case 'opensuse':
			logo.className = "fl-opensuse";
			logo.style.color = "#73ba25";
			break;
		default:
			logo.className = "fl-tux";
			break;
	}

	logo.className += " node_status_logo fl-72";

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
    fontLinux.href="/node_modules/font-logos/assets/font-logos.css";
    document.head.appendChild(fontLinux);
}
