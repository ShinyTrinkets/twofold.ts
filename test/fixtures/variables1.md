
<set debug=false User=? />

For this TOML, the data is grouped inside SomeConfig:

<toml>
debug = true

[SomeConfig]
db_name = "example_DB"
db_host = "localhost"
db_port = 5432
</toml>

For this one, the data is inside SshCfg:

<toml 'SshCfg'>
ForwardAgent = "no"
ForwardX11 = "no"
User = "user"
Port = 222
Protocol = 2
ServerAliveInterval = 60
ServerAliveCountMax = 30
</toml>

Some random variables; should <yesOrNo freeze=1/> be imported.

<randomInt freeze=1/>
