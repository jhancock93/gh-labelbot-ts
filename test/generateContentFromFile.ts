
export function generateContentJson(filename: string, path: string, content: string) {
    let buff = new Buffer(content)
    let content64 = buff.toString('base64')
    const finalContent = `
    {
        "type": "file",
        "encoding": "base64",
        "size": 5362,
        "name": "${filename}",
        "path": "${path}",
        "content": "${content64}",
        "sha": "3d21ec53a331a6f037a91c368710b99387d012c1",
        "url": "https://api.github.com/repos/jhancock93/probot-test/contents/${path}",
        "git_url": "https://api.github.com/repos/jhancock93/probot-test/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1",
        "html_url": "https://github.com/jhancock93/probot-test/blob/master/${path}",
        "download_url": "https://raw.githubusercontent.com/jhancock93/probot-test/master/${path}",
        "_links": {
            "git": "https://api.github.com/repos/jhancock93/probot-test/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1",
            "self": "https://api.github.com/repos/jhancock93/probot-test/contents/${path}",
            "html": "https://github.com/jhancock93/probot-test/blob/master/${path}"
        }
    }`
    return JSON.parse(finalContent)
}