/**
 * Class BX.Scale.Server
 * Describes server's props, view & behavior
 */
;(function(window) {

	if (BX.Scale.Server) return;

	/**
	 * Class BX.Scale.Server
	 * @constructor
	 */
	BX.Scale.Server = function (hostname, params)
	{
		this.hostname = hostname;
		this.ip = params.ip;
		this.roles = {};
		this.bxEnvVer = params.BX_ENV_VER || false;
		this.bxEnvNeedUpdate = params.BX_ENV_NEED_UPDATE || false;
		this.roles["SERVER"] =  new BX.Scale.Role("SERVER", hostname, { noActions: this.bxEnvNeedUpdate });

		if(params.roles !== undefined)
		{
			for(var i in BX.Scale.rolesList)
			{
				var rParams = {};

				if(i != "SERVER")
				{
					if(!params.roles[i])
					{
						rParams.type = "norole";

						if(BX.Scale.rolesList[i].HIDE_NOROLE)
							continue;
					}
					else if(params.roles[i].type)
					{
						rParams.type = params.roles[i].type;
					}
				}

				rParams.noActions = this.bxEnvNeedUpdate;
				this.roles[i] =  new BX.Scale.Role(i, hostname, rParams);
			}

			var monCat = {};

			for(var r in this.roles)
			{
				var rmCat =  this.roles[r].getMonitoringCategories(hostname);

				for(var cat in rmCat)
				{
					if(BX.Scale.monitoringCategories[hostname][cat] && this.roles[r].type != "norole")
						monCat[cat] = BX.Scale.monitoringCategories[hostname][cat];
				}
			}

			if(BX.Scale.monitoringEnabled && BX.Scale.isMonitoringDbCreated[this.hostname])
				this.infoTable = new BX.Scale.InfoTable(this.hostname, monCat);
		}

		this.domObj = null;
		this.idPrefix = hostname;
		this.showDel = params.showDel === true;
	};

	/**
	 * Returns DOM object contains server data
	 * @returns {object}
	 */

	BX.Scale.Server.prototype.getRolesObj = function()
	{
		var rolesObj = document.createElement("div");
		BX.addClass(rolesObj, "adm-scale-cont-block");

		for(var key in this.roles)
		{
			var roleObj = this.roles[key].getDomObj();

			if(roleObj)
			{
				rolesObj.appendChild(roleObj);
			}
		}

		return rolesObj;
	};

	BX.Scale.Server.prototype.getMenuObj = function()
	{
		var domObj = document.createElement("span");
		BX.addClass(domObj, "adm-scale-menu-btn");
		domObj.innerHTML = BX.message("SCALE_PANEL_JS_MENU");
		BX.bind(domObj, "click", BX.proxy(this.actionsMenuOpen, this));

		return domObj;
	};

	BX.Scale.Server.prototype.actionsMenuOpen = function(event)
	{
		event = event || window.event;
		var menuButton = event.target || event.srcElement;
		var menuItems =[];
		var actionsIds = this.getAviableActionsList();

		for(var key in actionsIds)
		{
			var action = BX.Scale.actionsCollection.getObject(key);

			if(action)
			{
				menuItems.push({
					TEXT: action.name,
					ONCLICK: "BX.Scale.actionsCollection.getObject('"+key+"').start('"+this.hostname+"');"
				});
			}
		}

		if (!menuButton.OPENER)
			BX.adminShowMenu(menuButton, menuItems, {active_class: "bx-adm-scale-menu-butt-active"});
		else
			menuButton.OPENER.SetMenu(menuItems);

		return BX.PreventDefault(event);
	};

	BX.Scale.Server.prototype.getHeaderObj = function()
	{
		var blockObj = document.createElement("div"),
			_this = this;

		BX.addClass(blockObj, "adm-scale-block-header");

		blockObj.appendChild(this.getMenuObj());

		var titleObj = document.createElement("span");
		BX.addClass(titleObj, "adm-scale-title");

		var bxEnvVer = "";

		if(this.bxEnvVer)
		{
			if(this.bxEnvNeedUpdate)
				bxEnvVer = "<span style='color: red;' title='"+BX.message("SCALE_PANEL_JS_BX_ENV_NEED_UPDATE")+"'>"+this.bxEnvVer+"</span>";
			else
				bxEnvVer = "<span>"+this.bxEnvVer+"</span>";
		}
		else
		{
			bxEnvVer = "<span style='color: red;' title='"+BX.message("SCALE_PANEL_JS_BX_ENV_NOT_INSTALLED")+"'>0.0-0</span>";
		}

		titleObj.innerHTML = this.hostname + ' / ' + this.ip + ' / '+BX.message('SCALE_PANEL_JS_BX_ENV_VERSION')+' '+bxEnvVer;
		titleObj.title = BX.message("SCALE_JS_SERVER_TITLE_TITLE");
		BX.bind(titleObj, "click", function(e){ window.location.href = BX.Scale.AdminFrame.graphPageUrl+"&SERVER_HOSTNAME="+_this.hostname});
		blockObj.appendChild(titleObj);

		if(this.showDel)
		{
			var delObj = document.createElement("span");
			BX.addClass(delObj, "adm-scale-block-del");
			blockObj.appendChild(delObj);
		}

		var imgObj = document.createElement("span");
		BX.addClass(imgObj, "adm-scale-img");
		blockObj.appendChild(imgObj);

		return blockObj;
	};

	BX.Scale.Server.prototype.getDomObj = function()
	{
		if(!this.domObj)
		{
			this.domObj = document.createElement("div");
			this.domObj.id = this.idPrefix;
			BX.addClass(this.domObj, "adm-scale-block");

			this.domObj.appendChild(this.getHeaderObj());
			this.domObj.appendChild(this.getRolesObj());

			if(this.infoTable)
				this.domObj.appendChild(this.infoTable.getDomObj());
			else if(!BX.Scale.monitoringEnabled)
				this.domObj.appendChild(BX.create("DIV", {props: {className:'adm-scale-block-bottom'}, html: BX.message("SCALE_PANEL_MONITORING_DISABLED")}));
			else if(!BX.Scale.isMonitoringDbCreated[this.hostname])
				this.domObj.appendChild(BX.create("DIV", {props: {className:'adm-scale-block-bottom'}, html: BX.message("SCALE_PANEL_JS_MONITORING_DATABASE_CREATING")}));

		}

		return this.domObj;
	};

	/**
	 * Returns the list of actions aviable for concrete server object
	 * @returns {object}
	 */
	BX.Scale.Server.prototype.getAviableActionsList = function()
	{
		var result = {};

		if(!this.bxEnvNeedUpdate)
		{
			for(var roleId in this.roles)
			{
				if(this.roles[roleId].type == "norole")
					continue;

				if(BX.Scale.rolesList[roleId])
				{
					var role = BX.Scale.rolesList[roleId];

					for(var actionId in role.ACTIONS)
					{
						if(role.ACTIONS[actionId] == 'DEL_SERVER' && this.roles['mgmt'])
							continue;

						if(!result[role.ACTIONS[actionId]])
							result[role.ACTIONS[actionId]] = true;
					}
				}
				else
				{
					BX.debug("Error! Role "+this.roles[roleId]+" not exist");
				}
			}
		}
		else
		{
			result["UPDATE_BVM"] = true;
		}

		return result;
	};

	BX.Scale.Server.prototype.getMonitoringParams = function()
	{
		var result = {};

		if(this.infoTable)
			result = this.infoTable.getStructure();

		return result;
	};

	BX.Scale.Server.prototype.setMonitoringValues = function(values)
	{
		var result = false;

		if(this.infoTable)
			result = this.infoTable.setValues(values);

		return result;
	};

	})(window);