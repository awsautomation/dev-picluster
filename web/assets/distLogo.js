function distLogo(dist) {
	var logo = document.createElement('span');
	logo.style.fontSize = "100px";
	switch (dist) {
		case 'alpine linux':
			logo.className = "fl-alpine";
			logo.style.color = "#0d597f";
			return logo.outerHTML;
		case 'centos':
			logo.className = "fl-centos";
			return logo.outerHTML;
		case 'rhel':
		case 'rhas':
		case 'red hat linux':
			logo.className = "fl-redhat";
			logo.style.color = "#e93442";
			return logo.outerHTML;
		case 'elementary os':
			logo.className = "fl-elementary";
			return logo.outerHTML;
		case 'gentoo linux':
			logo.className = "fl-gentoo";
			logo.style.color = "#514575";
			return logo.outerHTML;
		case 'mandriva linux':
			logo.className = "fl-mandriva";
			return logo.outerHTML;
		case 'raspbian':
			logo.className = "fl-raspberry-pi";
			logo.style.color = "#d6264f";
			return logo.outerHTML;
		case 'slackware':
			logo.className = "fl-slackware";
			return logo.outerHTML;
		case 'aosc':
			logo.className = "fl-aosc";
			return logo.outerHTML;
		case 'coreos':
			logo.className = "fl-coreos";
			return logo.outerHTML;
		case 'fedora':
			logo.className = "fl-fedora";
			logo.style.color = "#294172";
			return logo.outerHTML;
		case 'linux mint':
			logo.className = "fl-linuxmint";
			logo.style.color = "#86ce3e";
			return logo.outerHTML;
		case 'manjaro':
			logo.className = "fl-manjaro";
			logo.style.color = "#37bf5d";
			return logo.outerHTML;
		case 'apple':
		case 'osx':
		case 'macos':
		case 'darwin':
			logo.className = "fl-apple";
			return logo.outerHTML;
		case 'nixos':
			logo.className = "fl-nixos";
			return logo.outerHTML;
		case 'sabayon':
			logo.className = "fl-sabayon";
			return logo.outerHTML;
		case 'debian':
			logo.className = "fl-debian";
			logo.style.color = "#d70751";
			return logo.outerHTML;
		case 'ubuntu':
		case 'ubuntu linux':
			logo.className = "fl-ubuntu-inverse";
			logo.style.color = "#dd4814"
			return logo.outerHTML;
		case 'arch linux':
			logo.className = "fl-archlinux";
			logo.style.color = "#1793d1";
			return logo.outerHTML;
		case 'freebsd':
			logo.className = "fl-freebsd";
			logo.style.color = "#eb0028";
			return logo.outerHTML;
		case 'mageia':
			logo.className = "fl-mageia";
			return logo.outerHTML;
		case 'opensuse':
			logo.className = "fl-opensuse";
			logo.style.color = "#73ba25";
			return logo.outerHTML;
		default:
			logo.className = "fl-tux"
			return logo.outerHTML;
	}
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